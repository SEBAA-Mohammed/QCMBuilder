// aiTestController.js
const { HfInference } = require('@huggingface/inference');
const pool = require("../config/database");

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const generatePrompt = (topic, difficulty) => {
  return `Generate 5 multiple choice questions about ${topic} at ${difficulty} difficulty level. 
Each question should test different aspects of ${topic}.
Format each question as follows:

Q1: [Question]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Correct: [A/B/C/D]

Keep answers concise and clear.`;
};

const parseAIResponse = (text) => {
  const questions = [];
  const blocks = text.split(/Q\d+:/g).filter(block => block.trim());

  for (let block of blocks) {
    const lines = block.trim().split('\n');
    const content = lines[0].trim();
    const answers = [];
    let correctLetter = '';

    for (const line of lines) {
      if (line.startsWith('Correct:')) {
        correctLetter = line.replace('Correct:', '').trim();
        continue;
      }

      const match = line.match(/^([A-D])\)(.*)/);
      if (match) {
        const [, letter, answerText] = match;
        answers.push({
          content: answerText.trim(),
          is_correct: letter === correctLetter
        });
      }
    }

    if (content && answers.length === 4) {
      questions.push({
        content,
        type: 'one-correct-choice',
        points: 1,
        answers
      });
    }
  }

  return questions;
};

const aiTestController = {
  generateAndAddQuestions: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { topic, difficulty, testId } = req.body;

      // Generate questions using AI
      const response = await hf.textGeneration({
        model: 'facebook/opt-1.3b',
        inputs: generatePrompt(topic, difficulty),
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.7,
          top_p: 0.95,
        },
      });

      const questions = parseAIResponse(response.generated_text);

      // Add questions to database
      await connection.beginTransaction();

      for (const question of questions) {
        // Get next order number
        const [orderResult] = await connection.query(
          "SELECT COALESCE(MAX(order_num), 0) + 1 as next_order FROM questions WHERE test_id = ?",
          [testId]
        );

        // Insert question
        const [questionResult] = await connection.query(
          `INSERT INTO questions (test_id, content, type, points, order_num)
           VALUES (?, ?, ?, ?, ?)`,
          [testId, question.content, question.type, question.points, orderResult[0].next_order]
        );

        // Insert answers
        for (const answer of question.answers) {
          await connection.query(
            `INSERT INTO answers (question_id, content, is_correct, order_num)
             VALUES (?, ?, ?, ?)`,
            [
              questionResult.insertId,
              answer.content,
              answer.is_correct,
              question.answers.indexOf(answer) + 1,
            ]
          );
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: "AI questions generated and added successfully",
        questionCount: questions.length
      });

    } catch (error) {
      await connection.rollback();
      console.error("Error generating and adding AI questions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate and add questions",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }
};

module.exports = aiTestController;