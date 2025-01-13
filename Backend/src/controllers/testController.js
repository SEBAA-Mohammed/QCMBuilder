const pool = require("../config/database");

const testController = {
  createTest: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const {
        title,
        description,
        time_limit,
        passing_score,
        is_randomized,
        attempts_allowed,
        user,
        status,
      } = req.body;

      const teacher_id = req.body.user.id;

      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO tests (
                    title, description, teacher_id, time_limit, 
                    passing_score, is_randomized, attempts_allowed, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          description,
          teacher_id,
          time_limit,
          passing_score,
          is_randomized,
          attempts_allowed,
          status,
        ]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        testId: result.insertId,
        message: "Test created successfully",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error creating test:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create test",
      });
    } finally {
      connection.release();
    }
  },

  getTests: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const teacher_id = req.user.id;

      const [tests] = await connection.query(
        "SELECT * FROM tests WHERE teacher_id = ? ORDER BY created_at DESC",
        [teacher_id]
      );

      res.json({ success: true, tests });
    } catch (error) {
      console.error("Error fetching tests:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch tests",
      });
    } finally {
      connection.release();
    }
  },

  addQuestion: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { testId } = req.params;
      const { content, type, points, answers } = req.body;

      // Get the photo path if an image was uploaded
      const photo_path = req.file
        ? `/uploads/questions/${req.file.filename}`
        : null;

      await connection.beginTransaction();

      // Get next order number
      const [orderResult] = await connection.query(
        "SELECT COALESCE(MAX(order_num), 0) + 1 as next_order FROM questions WHERE test_id = ?",
        [testId]
      );

      // Insert question with photo_path
      const [questionResult] = await connection.query(
        `INSERT INTO questions (test_id, content, type, points, order_num, photo_path)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [testId, content, type, points, orderResult[0].next_order, photo_path]
      );

      // Parse answers from string back to array if it's a string
      const parsedAnswers =
        typeof answers === "string" ? JSON.parse(answers) : answers;

      // Insert answers
      for (const answer of parsedAnswers) {
        await connection.query(
          `INSERT INTO answers (question_id, content, is_correct, order_num)
           VALUES (?, ?, ?, ?)`,
          [
            questionResult.insertId,
            answer.content,
            answer.is_correct,
            parsedAnswers.indexOf(answer) + 1,
          ]
        );
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        questionId: questionResult.insertId,
        photo_path: photo_path,
        message: "Question added successfully",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error adding question:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add question",
      });
    } finally {
      connection.release();
    }
  },
  getTestById: async (req, res) => {
    console.log(req.query);
    const connection = await pool.getConnection();
    try {
      const { testId, teacherId } = req.query;

      // Get test details
      const [test] = await connection.query(
        "SELECT * FROM tests WHERE id = ? AND teacher_id = ?",
        [testId, teacherId]
      );

      if (test.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Test not found",
        });
      }

      // Get questions with answers and photo_path
      const [questions] = await connection.query(
        `SELECT q.*, 
                GROUP_CONCAT(CONCAT(a.id, '::', a.content, '::', a.is_correct) SEPARATOR '||') as answers
         FROM questions q
         LEFT JOIN answers a ON q.id = a.question_id
         WHERE q.test_id = ?
         GROUP BY q.id
         ORDER BY q.order_num`,
        [testId]
      );

      // Format the answers
      const formattedQuestions = questions.map((q) => ({
        ...q,
        answers: q.answers
          ? q.answers.split("||").map((a) => {
              const [id, content, is_correct] = a.split("::");
              return {
                id: parseInt(id),
                content,
                is_correct: is_correct === "1",
              };
            })
          : [],
      }));

      res.json({
        success: true,
        test: test[0],
        questions: formattedQuestions,
      });
    } catch (error) {
      console.error("Error fetching test:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch test details",
      });
    } finally {
      connection.release();
    }
  },

  deleteQuestion: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { testId, questionId } = req.params;

      await connection.beginTransaction();

      // Get current order number
      const [orderResult] = await connection.query(
        "SELECT order_num FROM questions WHERE id = ? AND test_id = ?",
        [questionId, testId]
      );

      if (orderResult.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      // Delete question (cascade will handle answers)
      await connection.query(
        "DELETE FROM questions WHERE id = ? AND test_id = ?",
        [questionId, testId]
      );

      // Update order numbers
      await connection.query(
        `UPDATE questions 
                 SET order_num = order_num - 1 
                 WHERE test_id = ? AND order_num > ?`,
        [testId, orderResult[0].order_num]
      );

      await connection.commit();

      res.json({
        success: true,
        message: "Question deleted successfully",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error deleting question:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete question",
      });
    } finally {
      connection.release();
    }
  },
  updateTest: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
      const {
        title,
        description,
        time_limit,
        passing_score,
        is_randomized,
        attempts_allowed,
        status,
      } = req.body;

      await connection.beginTransaction();

      const [result] = await connection.query(
        `UPDATE tests SET 
          title = ?, 
          description = ?, 
          time_limit = ?, 
          passing_score = ?, 
          is_randomized = ?, 
          attempts_allowed = ?, 
          status = ? 
       WHERE id = ?`,
        [
          title,
          description,
          time_limit,
          passing_score,
          is_randomized,
          attempts_allowed,
          status,
          id,
        ]
      );

      await connection.commit();

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Test not found",
        });
      }

      res.json({
        success: true,
        message: "Test updated successfully",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error updating test:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update test",
      });
    } finally {
      connection.release();
    }
  },
  deleteTest: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;

      await connection.beginTransaction();

      const [result] = await connection.query(
        "DELETE FROM tests WHERE id = ?",
        [id]
      );

      await connection.commit();

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Test not found",
        });
      }

      res.json({
        success: true,
        message: "Test deleted successfully",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error deleting test:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete test",
      });
    } finally {
      connection.release();
    }
  },
  updateQuestion: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { testId, questionId } = req.params;
      const { content, type, points, answers } = req.body;

      const photo_path = req.file
        ? `/uploads/questions/${req.file.filename}`
        : null;

      await connection.beginTransaction();

      const [result] = await connection.query(
        `UPDATE questions SET 
          content = ?, 
          type = ?, 
          points = ?, 
          photo_path = IFNULL(?, photo_path) 
       WHERE id = ? AND test_id = ?`,
        [content, type, points, photo_path, questionId, testId]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      // Delete existing answers
      await connection.query("DELETE FROM answers WHERE question_id = ?", [
        questionId,
      ]);

      // Insert updated answers
      const parsedAnswers =
        typeof answers === "string" ? JSON.parse(answers) : answers;

      for (const answer of parsedAnswers) {
        await connection.query(
          `INSERT INTO answers (question_id, content, is_correct, order_num)
         VALUES (?, ?, ?, ?)`,
          [
            questionId,
            answer.content,
            answer.is_correct,
            parsedAnswers.indexOf(answer) + 1,
          ]
        );
      }

      await connection.commit();

      res.json({
        success: true,
        message: "Question updated successfully",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error updating question:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update question",
      });
    } finally {
      connection.release();
    }
  },

  updateQuestionOrder: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { testId, questionId } = req.params;
      const { new_order } = req.body;

      await connection.beginTransaction();

      // Get current order number
      const [currentOrder] = await connection.query(
        "SELECT order_num FROM questions WHERE id = ? AND test_id = ?",
        [questionId, testId]
      );

      if (currentOrder.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      const oldOrder = currentOrder[0].order_num;

      // Update orders
      if (new_order > oldOrder) {
        await connection.query(
          `UPDATE questions 
                     SET order_num = order_num - 1 
                     WHERE test_id = ? AND order_num > ? AND order_num <= ?`,
          [testId, oldOrder, new_order]
        );
      } else if (new_order < oldOrder) {
        await connection.query(
          `UPDATE questions 
                     SET order_num = order_num + 1 
                     WHERE test_id = ? AND order_num >= ? AND order_num < ?`,
          [testId, new_order, oldOrder]
        );
      }

      await connection.query(
        "UPDATE questions SET order_num = ? WHERE id = ?",
        [new_order, questionId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: "Question order updated successfully",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error updating question order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update question order",
      });
    } finally {
      connection.release();
    }
  },
};

module.exports = testController;
