const pool = require("../config/database");

const getStudentStats = async (req, res) => {
  const { studentId } = req.query;

  try {
    // Get total number of attempts
    const [totalAttempts] = await pool.query(
      "SELECT COUNT(*) AS totalAttempts FROM test_attempts WHERE student_id = ?",
      [studentId]
    );

    // Get number of completed tests
    const [testsCompleted] = await pool.query(
      "SELECT COUNT(*) AS testsCompleted FROM test_attempts WHERE student_id = ? AND status = 'completed'",
      [studentId]
    );

    // Get average score
    const [averageScore] = await pool.query(
      "SELECT AVG(score) AS averageScore FROM test_attempts WHERE student_id = ? AND status = 'completed'",
      [studentId]
    );

    res.json({
      totalAttempts: totalAttempts[0].totalAttempts,
      testsCompleted: testsCompleted[0].testsCompleted,
      averageScore: Number(averageScore[0].averageScore || 0).toFixed(1),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const getAvailableTests = async (req, res) => {
  try {
    // Get all published tests
    const [tests] = await pool.query(
      `SELECT id, title, description, time_limit, passing_score,teacher_id, attempts_allowed, created_at 
             FROM tests 
             WHERE status = 'draft' 
             ORDER BY created_at DESC`
    );

    res.json(tests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const getTestHistory = async (req, res) => {
  const { studentId } = req.query;

  try {
    const [history] = await pool.query(
      `SELECT 
                ta.id,
                ta.test_id,
                t.title as test_title,
                ta.score,
                ta.start_time,
                ta.end_time,
                ta.status
             FROM test_attempts ta
             JOIN tests t ON ta.test_id = t.id
             WHERE ta.student_id = ?
             ORDER BY ta.created_at DESC`,
      [studentId]
    );

    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const startTestAttempt = async (req, res) => {
  const { studentId, testId } = req.body;
  const connection = await pool.getConnection();
  
  try {
    // First get test info and check attempts
    const [testInfo] = await connection.query(
      `SELECT attempts_allowed, status 
       FROM tests 
       WHERE id = ?`,
      [testId]
    );

    if (!testInfo.length) {
      await connection.release();
      return res.status(404).json({ error: "Test not found" });
    }

    if (testInfo[0].status !== 'draft') {
      await connection.release();
      return res.status(400).json({ error: "Test is not available" });
    }

    const [attempts] = await connection.query(
      `SELECT COUNT(*) as attemptCount
       FROM test_attempts
       WHERE student_id = ? 
       AND test_id = ? 
       AND status != 'expired'`,
      [studentId, testId]
    );

    if (attempts[0].attemptCount >= testInfo[0].attempts_allowed) {
      await connection.release();
      return res.status(400).json({
        error: "Maximum number of attempts reached for this test"
      });
    }

    // Check for active attempts
    const [activeAttempt] = await connection.query(
      `SELECT id 
       FROM test_attempts 
       WHERE student_id = ? 
       AND test_id = ? 
       AND status = 'in_progress'`,
      [studentId, testId]
    );

    if (activeAttempt.length > 0) {
      await connection.release();
      return res.status(409).json({
        error: "You have an active attempt in progress",
        attemptId: activeAttempt[0].id
      });
    }

    try {
      await connection.beginTransaction();

      // Double-check active attempts inside transaction
      const [doubleCheck] = await connection.query(
        `SELECT id 
         FROM test_attempts 
         WHERE student_id = ? 
         AND test_id = ? 
         AND status = 'in_progress'
         FOR UPDATE`,
        [studentId, testId]
      );

      if (doubleCheck.length > 0) {
        await connection.rollback();
        await connection.release();
        return res.status(409).json({
          error: "You have an active attempt in progress",
          attemptId: doubleCheck[0].id
        });
      }

      // Create new test attempt
      const [result] = await connection.query(
        `INSERT INTO test_attempts (test_id, student_id, start_time, status)
         VALUES (?, ?, CURRENT_TIMESTAMP, 'in_progress')`,
        [testId, studentId]
      );

      await connection.commit();

      // Get questions with answers
      const [questions] = await connection.query(
        `SELECT 
           q.id, 
           q.content, 
           q.type, 
           q.points, 
           q.photo_path,
           GROUP_CONCAT(
             JSON_OBJECT(
               'id', a.id,
               'content', a.content
             )
           ) as answers
         FROM questions q
         LEFT JOIN answers a ON q.id = a.question_id
         WHERE q.test_id = ?
         GROUP BY q.id
         ORDER BY q.order_num`,
        [testId]
      );

      // Process the questions to parse the JSON answers
      const processedQuestions = questions.map(q => ({
        ...q,
        answers: JSON.parse(`[${q.answers}]`)
      }));

      await connection.release();
      return res.json({
        attemptId: result.insertId,
        questions: processedQuestions
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    await connection.release();
    console.error('Start test attempt error:', error);
    res.status(500).json({ 
      error: "Failed to start test attempt",
      details: error.message
    });
  }
};

const submitTestAttempt = async (req, res) => {
    const { attemptId, answers } = req.body;
    const connection = await pool.getConnection();
  
    try {
      await connection.beginTransaction();
  
      // Get test info for passing score
      const [testInfo] = await connection.query(
        `SELECT t.passing_score, t.title
         FROM tests t
         JOIN test_attempts ta ON t.id = ta.test_id
         WHERE ta.id = ?`,
        [attemptId]
      );
  
      if (!testInfo.length) {
        await connection.release();
        return res.status(404).json({ error: "Test attempt not found" });
      }
  
      // Process each answer and calculate correctness
      for (const answer of answers) {
        // Get correct answer and points for this question
        const [questionInfo] = await connection.query(
          `SELECT q.points, a.is_correct 
           FROM questions q 
           JOIN answers a ON a.question_id = q.id 
           WHERE q.id = ? AND a.id = ?`,
          [answer.questionId, answer.selectedAnswerId]
        );
  
        const isCorrect = questionInfo[0]?.is_correct || false;
        const pointsEarned = isCorrect ? questionInfo[0]?.points : 0;
  
        // Save student answer
        await connection.query(
          `INSERT INTO student_answers 
           (attempt_id, question_id, selected_answer_id, is_correct, points_earned)
           VALUES (?, ?, ?, ?, ?)`,
          [attemptId, answer.questionId, answer.selectedAnswerId, isCorrect, pointsEarned]
        );
      }
  
      // Calculate final score using stored procedure
      await connection.query("CALL calculate_test_score(?)", [attemptId]);
  
      // Get final score
      const [attempt] = await connection.query(
        "SELECT score FROM test_attempts WHERE id = ?",
        [attemptId]
      );
  
      await connection.commit();
  
      // Prepare response message based on score
      const score = attempt[0].score;
      const passingScore = testInfo[0].passing_score;
      let message = "";
      let status = "";
  
      if (score >= passingScore) {
        message = `Congratulations! You passed the test with a score of ${score}%`;
        status = "success";
      } else {
        message = `Unfortunately, you didn't pass the test. Your score is ${score}%. The passing score was ${passingScore}%`;
        status = "failure";
      }
  
      res.json({
        score,
        status,
        message,
        testTitle: testInfo[0].title,
        passingScore
      });
  
    } catch (error) {
      await connection.rollback();
      console.error('Submit test error:', error);
      res.status(500).json({ error: "Failed to submit test" });
    } finally {
      await connection.release();
    }
  };

module.exports = {
  getStudentStats,
  getAvailableTests,
  getTestHistory,
  startTestAttempt,
  submitTestAttempt,
};
