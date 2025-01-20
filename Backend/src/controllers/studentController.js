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
  const MAX_RETRIES = 3;
  let retryCount = 0;

  const attemptInsert = async () => {
    try {
      // First get test info and check attempts - outside transaction
      const [testInfo] = await pool.query(
        `SELECT attempts_allowed 
           FROM tests 
           WHERE id = ?`,
        [testId]
      );

      const [attempts] = await pool.query(
        `SELECT COUNT(*) as attemptCount
           FROM test_attempts
           WHERE student_id = ? 
           AND test_id = ? 
           AND status != 'expired'`,
        [studentId, testId]
      );

      if (attempts[0].attemptCount >= testInfo[0].attempts_allowed) {
        return res.status(400).json({
          error: "Maximum number of attempts reached for this test",
        });
      }

      // Check for active attempts - outside transaction
      const [activeAttempt] = await pool.query(
        `SELECT id 
           FROM test_attempts 
           WHERE student_id = ? 
           AND test_id = ? 
           AND status = 'in_progress'`,
        [studentId, testId]
      );

      if (activeAttempt.length > 0) {
        return res.status(409).json({
          error: "You have an active attempt in progress",
          attemptId: activeAttempt[0].id,
        });
      }

      // Start a shorter transaction just for the insert
      await pool.query("START TRANSACTION");

      // Double-check active attempts inside transaction
      const [doubleCheck] = await pool.query(
        `SELECT id 
           FROM test_attempts 
           WHERE student_id = ? 
           AND test_id = ? 
           AND status = 'in_progress'
           FOR UPDATE`, // Add row-level locking
        [studentId, testId]
      );

      if (doubleCheck.length > 0) {
        await pool.query("ROLLBACK");
        return res.status(409).json({
          error: "You have an active attempt in progress",
          attemptId: doubleCheck[0].id,
        });
      }

      // Create new test attempt
      const [result] = await pool.query(
        `INSERT INTO test_attempts (test_id, student_id, start_time, status)
           VALUES (?, ?, CURRENT_TIMESTAMP, 'in_progress')`,
        [testId, studentId]
      );

      await pool.query("COMMIT");

      // Get questions and answers outside of transaction
      const [questions] = await pool.query(
        `SELECT q.id, q.content, q.type, q.points, q.photo_path
           FROM questions q
           WHERE q.test_id = ?
           ORDER BY q.order_num`,
        [testId]
      );

      // Get answers for each question
      for (let question of questions) {
        const [answers] = await pool.query(
          `SELECT id, content
             FROM answers
             WHERE question_id = ?
             ORDER BY order_num`,
          [question.id]
        );
        question.answers = answers;
      }

      return res.json({
        attemptId: result.insertId,
        questions: questions,
      });
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  };

  // Retry loop
  while (retryCount < MAX_RETRIES) {
    try {
      return await attemptInsert();
    } catch (error) {
      retryCount++;

      if (error.code === "ER_LOCK_DEADLOCK" && retryCount < MAX_RETRIES) {
        // Wait for a short random time before retrying
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 1000)
        );
        continue;
      }

      console.error(error);
      return res.status(500).json({
        error: error.message,
        retryCount,
      });
    }
  }
};

const submitTestAttempt = async (req, res) => {
  const { attemptId, answers } = req.body;

  try {
    await pool.query("START TRANSACTION");

    // Process each answer
    for (const answer of answers) {
      await pool.query(
        `INSERT INTO student_answers (attempt_id, question_id, selected_answer_id)
                 VALUES (?, ?, ?)`,
        [attemptId, answer.questionId, answer.selectedAnswerId]
      );
    }

    // Calculate score
    await pool.query("CALL calculate_test_score(?)", [attemptId]);

    await pool.query("COMMIT");

    // Get final score
    const [attempt] = await pool.query(
      "SELECT score FROM test_attempts WHERE id = ?",
      [attemptId]
    );

    res.json({
      score: attempt[0].score,
      message: "Test submitted successfully",
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getStudentStats,
  getAvailableTests,
  getTestHistory,
  startTestAttempt,
  submitTestAttempt,
};
