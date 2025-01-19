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
            averageScore: Number(averageScore[0].averageScore || 0).toFixed(1)
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
            `SELECT id, title, description, time_limit, passing_score, attempts_allowed, created_at 
             FROM tests 
             WHERE status = 'published' 
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

    try {
        // Check if student has remaining attempts
        const [attempts] = await pool.query(
            `SELECT COUNT(*) as attemptCount, t.attempts_allowed
             FROM test_attempts ta
             JOIN tests t ON ta.test_id = t.id
             WHERE ta.student_id = ? AND ta.test_id = ?`,
            [studentId, testId]
        );

        if (attempts[0].attemptCount >= attempts[0].attempts_allowed) {
            return res.status(400).json({ 
                error: "Maximum number of attempts reached for this test" 
            });
        }

        // Create new test attempt
        const [result] = await pool.query(
            `INSERT INTO test_attempts (test_id, student_id, start_time, status)
             VALUES (?, ?, CURRENT_TIMESTAMP, 'in_progress')`,
            [testId, studentId]
        );

        // Get test questions
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

        res.json({
            attemptId: result.insertId,
            questions: questions
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

const submitTestAttempt = async (req, res) => {
    const { attemptId, answers } = req.body;

    try {
        await pool.query('START TRANSACTION');

        // Process each answer
        for (const answer of answers) {
            await pool.query(
                `INSERT INTO student_answers (attempt_id, question_id, selected_answer_id)
                 VALUES (?, ?, ?)`,
                [attemptId, answer.questionId, answer.selectedAnswerId]
            );
        }

        // Calculate score
        await pool.query('CALL calculate_test_score(?)', [attemptId]);

        await pool.query('COMMIT');

        // Get final score
        const [attempt] = await pool.query(
            'SELECT score FROM test_attempts WHERE id = ?',
            [attemptId]
        );

        res.json({ 
            score: attempt[0].score,
            message: "Test submitted successfully" 
        });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getStudentStats,
    getAvailableTests,
    getTestHistory,
    startTestAttempt,
    submitTestAttempt
};