const PDFDocument = require('pdfkit');
const pool = require("../config/database");

const generateTestPDF = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { testId } = req.params;
        const teacherId = req.user.id;

        // Get test details
        const [testResults] = await connection.query(
            "SELECT * FROM tests WHERE id = ? AND teacher_id = ?",
            [testId, teacherId]
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
                GROUP_CONCAT(CONCAT(a.id, '::', a.content, '::', a.is_correct) SEPARATOR '||') as answers
             FROM questions q
             LEFT JOIN answers a ON q.id = a.question_id
             WHERE q.test_id = ?
             GROUP BY q.id
             ORDER BY q.order_num`,
            [testId]
        );

        // Create a buffer to store the PDF
        const chunks = [];
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            bufferPages: true
        });

        // Collect the PDF chunks
        doc.on('data', chunk => chunks.push(chunk));

        // When PDF is done, send it to the client
        doc.on('end', () => {
            const pdfData = Buffer.concat(chunks);
            res.setHeader('Content-Length', pdfData.length);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${test.title}.pdf"`);
            res.send(pdfData);
        });

        // Add content to the PDF
        doc.font('Helvetica')
           .fontSize(20)
           .text('QCM Test', { align: 'center' })
           .moveDown();

        // Add test information
        doc.fontSize(14)
           .text(`Title: ${test.title}`)
           .text(`Description: ${test.description || 'N/A'}`)
           .text(`Time Limit: ${test.time_limit} minutes`)
           .text(`Passing Score: ${test.passing_score}%`)
           .moveDown();

        // Add questions
        questions.forEach((question, index) => {
            const answers = question.answers ? question.answers.split('||').map(a => {
                const [id, content] = a.split('::');
                return content;
            }) : [];

            // Add question
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text(`Question ${index + 1}:`)
               .font('Helvetica')
               .text(question.content)
               .moveDown(0.5);

            // Add answers
            answers.forEach((answer, ansIndex) => {
                doc.text(`${String.fromCharCode(65 + ansIndex)}) ${answer}`)
                   .moveDown(0.5);
            });

            doc.moveDown();
        });

        // Finalize the PDF
        doc.end();

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({
            success: false,
            message: "Failed to generate PDF"
        });
    } finally {
        connection.release();
    }
};

module.exports = { generateTestPDF };