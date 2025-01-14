const puppeteer = require('puppeteer');
const pool = require("../config/database");

const generateTestPDF = async (req, res) => {
    const connection = await pool.getConnection();
    let browser;
    
    try {
        console.log('PDF request received for test:', req.params.testId);
        const { testId } = req.params;
        
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
        console.log('Found test:', test.title);

        // Get questions with answers
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
        
        console.log(`Found ${questions.length} questions`);

        if (questions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No questions found for this test"
            });
        }

        // Generate HTML content
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .test-title { font-size: 24px; margin-bottom: 20px; }
                    .question { margin-bottom: 20px; }
                    .answer { margin-left: 20px; }
                </style>
            </head>
            <body>
                <div class="test-title">${test.title}</div>
                <div>
                    <p>Time Limit: ${test.time_limit} minutes</p>
                    <p>Passing Score: ${test.passing_score}%</p>
                </div>
                ${questions.map((question, index) => {
                    const answers = question.answers ? question.answers.split('||').map(a => {
                        const [id, content] = a.split('::');
                        return content;
                    }) : [];
                    
                    return `
                        <div class="question">
                            <p><strong>Question ${index + 1}:</strong> ${question.content}</p>
                            ${answers.map((answer, ansIndex) => `
                                <div class="answer">
                                    ${String.fromCharCode(65 + ansIndex)}) ${answer}
                                </div>
                            `).join('')}
                        </div>
                    `;
                }).join('')}
            </body>
            </html>
        `;

        console.log('HTML content generated');

        // Launch browser
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(htmlContent);
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });

        const headers = {
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': `attachment; filename="${test.title}.pdf"`
        };

        console.log('Sending PDF with headers:', headers);

        // Set all headers at once
        res.set(headers);
        
        // Send the PDF and return to prevent further execution
        return res.send(pdfBuffer);

    } catch (error) {
        console.error('Error in PDF generation:', error);
        // Only send error response if headers haven't been sent
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: "Failed to generate PDF",
                error: error.message
            });
        }
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed');
        }
        if (connection) {
            connection.release();
        }
    }
};

module.exports = { generateTestPDF };