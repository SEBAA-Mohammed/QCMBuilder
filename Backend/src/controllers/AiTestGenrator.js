const { HfInference } = require("@huggingface/inference");
const pool = require("../config/database");

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
const generatePrompt = (topic, difficulty) => {
  return `Create 5 multiple choice questions about ${topic} at ${difficulty} difficulty level. Format each question as:
  Q1: Question
  A) Option
  B) Option
  C) Option
  D) Option
  Correct: Letter`;
};

const aiTestController = {
  generateAndAddQuestions: async (req, res) => {
    const connection = await pool.getConnection();
    const { testId, topic, difficulty } = req.body;

    try {
      await connection.query(
        `INSERT INTO generation_status (test_id, status) VALUES (?, 'processing')`,
        [testId]
      );
      const response = await fetch(
        "https://api-inference.huggingface.co/models/openai-community/gpt2",
        {
          headers: {
            Authorization: "Bearer " + process.env.HUGGINGFACE_API_KEY,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify(generatePrompt(topic, difficulty)),
        }
      );
      const result = await response.json();
      console.log({ result });

      //           if (!response?.generated_text) {
      //             throw new Error("No response from model");
      //           }

      //           const questions = parseAIResponse(response.generated_text);

      //           await connection.beginTransaction();

      //           for (const question of questions) {
      //             const [orderResult] = await connection.query(
      //               "SELECT COALESCE(MAX(order_num), 0) + 1 as next_order FROM questions WHERE test_id = ?",
      //               [testId]
      //             );

      //             const [questionResult] = await connection.query(
      //               `INSERT INTO questions (test_id, content, type, points, order_num)
      //                VALUES (?, ?, ?, ?, ?)`,
      //               [testId, question.content, question.type, question.points, orderResult[0].next_order]
      //             );

      //             for (const answer of question.answers) {
      //               await connection.query(
      //                 `INSERT INTO answers (question_id, content, is_correct, order_num)
      //                  VALUES (?, ?, ?, ?)`,
      //                 [questionResult.insertId, answer.content, answer.is_correct, answer.order_num]
      //               );
      //             }
      //           }

      //           await connection.commit();
      //           await connection.query(
      //             `UPDATE generation_status SET status = 'completed' WHERE test_id = ?`,
      //             [testId]
      //           );

      //           res.json({ success: true, questionCount: questions.length });

      //         } catch (error) {
      //           if (connection) {
      //             await connection.rollback();
      //             await connection.query(
      //               `UPDATE generation_status SET status = 'failed', error_message = ? WHERE test_id = ?`,
      //               [error.message, testId]
      //             );
      //           }

      //           res.status(500).json({
      //             success: false,
      //             error: process.env.NODE_ENV === "development" ? error.message : "An error occurred"
      //           });
      //         } finally {
      //           if (connection) connection.release();
      //         }
      //   },
      //   checkGenerationStatus: async (req, res) => {
      //     const connection = await pool.getConnection();
      //     try {
      //       const { testId } = req.params;

      //       const [status] = await connection.query(
      //         `SELECT status, error_message FROM generation_status WHERE test_id = ?`,
      //         [testId]
      //       );

      //       if (!status.length) {
      //         return res.status(404).json({
      //           success: false,
      //           message: "Generation status not found",
      //         });
      //       }

      //   res.json({
      //     success: true,
      //     status: status[0],
      //   });
    } catch (error) {
      console.error("Error checking generation status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check generation status",
      });
    } finally {
      connection.release();
    }
  },
};

const parseAIResponse = (text) => {
  try {
    const questions = [];
    const questionBlocks = text.split(/Q\d+:/).filter((block) => block.trim());

    for (const block of questionBlocks) {
      const lines = block
        .trim()
        .split("\n")
        .filter((line) => line.trim());
      if (lines.length < 6) continue; // Skip invalid questions

      const question = {
        content: lines[0].trim(),
        type: "multiple-correct-choice",
        points: 1,
        answers: [],
      };

      const options = lines.slice(1, 5);
      const correctAnswer = lines.find((line) => line.startsWith("Correct:"));

      if (!correctAnswer) continue;

      const correctLetter = correctAnswer.split(":")[1].trim();

      options.forEach((option, index) => {
        const letter = option.split(")")[0].trim();
        const content = option.split(")")[1].trim();

        question.answers.push({
          content: content,
          is_correct: letter === correctLetter,
          order_num: index + 1,
        });
      });

      if (question.answers.length === 4) {
        questions.push(question);
      }
    }

    return questions;
  } catch (error) {
    console.error("Error parsing AI response:", error);
    throw new Error("Failed to parse AI response");
  }
};

exports.generateAndAddQuestions = aiTestController.generateAndAddQuestions;
exports.checkGenerationStatus = aiTestController.checkGenerationStatus;
