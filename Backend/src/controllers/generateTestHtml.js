const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const pool = require("../config/database");

const generateTestHTML = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        console.log('HTML export request received for test:', req.params.testId);
        const { testId } = req.params;
        const { format = 'zip' } = req.query; // 'zip' or 'single'
        
        // Get test details
        const [testResults] = await connection.query(
            "SELECT * FROM tests WHERE id = ?",
            [testId]
        );

        if (testResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Test not found"
            });
        }

        const test = testResults[0];
        
        // Get questions with answers
        const [questions] = await connection.query(
            `SELECT q.*, 
                GROUP_CONCAT(CONCAT(a.id, '::', a.content, '::', a.is_correct) SEPARATOR '||') as answers,
                q.photo_path
             FROM questions q
             LEFT JOIN answers a ON q.id = a.question_id
             WHERE q.test_id = ?
             GROUP BY q.id
             ORDER BY q.order_num`,
            [testId]
        );

        if (format === 'single') {
            // Generate single HTML file with base64 images
            const htmlContent = await generateSingleHTML(test, questions);
            
            res.set('Content-Type', 'text/html');
            res.set('Content-Disposition', `attachment; filename="${test.title}.html"`);
            return res.send(htmlContent);
        } else {
            // Generate ZIP with HTML and images
            const zip = new AdmZip();
            const htmlContent = await generateZippedHTML(test, questions);
            
            // Add main HTML file
            zip.addFile('index.html', Buffer.from(htmlContent));
            
            // Add images if they exist
            for (const question of questions) {
                if (question.photo_path) {
                    const imagePath = path.join(__dirname, '../../public', question.photo_path);
                    if (fs.existsSync(imagePath)) {
                        const imageBuffer = fs.readFileSync(imagePath);
                        const imageName = path.basename(question.photo_path);
                        zip.addFile(`images/${imageName}`, imageBuffer);
                    }
                }
            }

            // Generate and send zip
            const zipBuffer = zip.toBuffer();
            res.set('Content-Type', 'application/zip');
            res.set('Content-Length', zipBuffer.length);
            res.set('Content-Disposition', `attachment; filename="${test.title}_test.zip"`);
            return res.send(zipBuffer);
        }

    } catch (error) {
        console.error('Error in HTML generation:', error);
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: "Failed to generate HTML package",
                error: error.message
            });
        }
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

async function generateSingleHTML(test, questions) {
    // Convert images to base64
    const questionsWithBase64 = await Promise.all(questions.map(async (question) => {
        if (question.photo_path) {
            const imagePath = path.join(__dirname, '../../public', question.photo_path);
            if (fs.existsSync(imagePath)) {
                const imageBuffer = fs.readFileSync(imagePath);
                const base64Image = imageBuffer.toString('base64');
                const extension = path.extname(question.photo_path).substring(1);
                question.base64Image = `data:image/${extension};base64,${base64Image}`;
            }
        }
        return question;
    }));

    return generateHTMLContent(test, questionsWithBase64, true);
}

async function generateZippedHTML(test, questions) {
    return generateHTMLContent(test, questions, false);
}

function generateHTMLContent(test, questions, isSingleFile) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${test.title}</title>
    <style>
        :root {
            --primary-color: #007bff;
            --primary-hover: #0056b3;
            --border-color: #e2e8f0;
            --background-color: #f8fafc;
            --text-color: #2d3748;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--background-color);
            padding: 2rem;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .header {
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid var(--border-color);
        }

        .header h1 {
            color: var(--primary-color);
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }

        .test-info {
            background-color: var(--background-color);
            padding: 1rem;
            border-radius: 6px;
            margin-bottom: 2rem;
        }

        .test-info p {
            margin: 0.5rem 0;
            font-size: 1.1rem;
        }

        .question { 
            background-color: white;
            margin-bottom: 2rem;
            padding: 1.5rem;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .question:hover {
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }

        .question h3 {
            color: var(--primary-color);
            font-size: 1.3rem;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid var(--border-color);
        }

        .question-content {
            font-size: 1.1rem;
            margin-bottom: 1rem;
        }

        .question img {
            max-width: 100%;
            height: auto;
            margin: 1rem 0;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .answers {
            margin: 1rem 0;
        }

        .answer {
            display: flex;
            align-items: center;
            margin: 0.8rem 0;
            padding: 0.8rem;
            background-color: var(--background-color);
            border-radius: 4px;
            transition: background-color 0.2s ease;
        }

        .answer:hover {
            background-color: #edf2f7;
        }

        .answer input[type="radio"] {
            margin-right: 1rem;
            width: 18px;
            height: 18px;
        }

        .answer label {
            font-size: 1.05rem;
            cursor: pointer;
            flex: 1;
        }

        @media (max-width: 768px) {
            body {
                padding: 1rem;
            }

            .container {
                padding: 1rem;
            }

            .header h1 {
                font-size: 2rem;
            }

            .question {
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${test.title}</h1>
            <div class="test-info">
                <p>Time Limit: ${test.time_limit} minutes</p>
                <p>Passing Score: ${test.passing_score}%</p>
            </div>
        </div>

        <form id="quiz-form">
            ${questions.map((question, index) => {
                const answers = question.answers ? question.answers.split('||').map(a => {
                    const [id, content] = a.split('::');
                    return { id, content };
                }) : [];
                
                return `
                    <div class="question">
                        <h3>Question ${index + 1}</h3>
                        <div class="question-content">${question.content}</div>
                        ${isSingleFile && question.base64Image ? 
                            `<img src="${question.base64Image}" alt="Question image">` 
                            : question.photo_path ? 
                            `<img src="images/${path.basename(question.photo_path)}" alt="Question image">` 
                            : ''}
                        <div class="answers">
                            ${answers.map((answer) => `
                                <div class="answer">
                                    <input type="radio" 
                                           name="q${question.id}" 
                                           value="${answer.id}"
                                           id="q${question.id}a${answer.id}">
                                    <label for="q${question.id}a${answer.id}">${answer.content}</label>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </form>
    </div>
</body>
</html>
    `;
}

module.exports = { generateTestHTML };