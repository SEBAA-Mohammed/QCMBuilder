const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const pool = require("../config/database");

const generateTestSCORM = async (req, res) => {
    const connection = await pool.getConnection();
    const zip = new AdmZip();
    
    try {
        console.log('SCORM package request received for test:', req.params.testId);
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
                GROUP_CONCAT(CONCAT(a.id, '::', a.content, '::', a.is_correct) SEPARATOR '||') as answers,
                q.photo_path
             FROM questions q
             LEFT JOIN answers a ON q.id = a.question_id
             WHERE q.test_id = ?
             GROUP BY q.id
             ORDER BY q.order_num`,
            [testId]
        );

        // Create SCORM content structure
        const contentHtml = generateContentHtml(test, questions);
        const imsManifest = generateImsManifest(test);
        const scormLogic = generateScormLogic(test);

        // Add files to zip
        zip.addFile('index.html', Buffer.from(contentHtml));
        zip.addFile('imsmanifest.xml', Buffer.from(imsManifest));
        zip.addFile('scorm_api.js', Buffer.from(scormLogic));

        // Copy question images if they exist
        questions.forEach(question => {
            if (question.photo_path) {
                const imagePath = path.join(__dirname, '../../public', question.photo_path);
                if (fs.existsSync(imagePath)) {
                    const imageBuffer = fs.readFileSync(imagePath);
                    const imageName = path.basename(question.photo_path);
                    zip.addFile(`images/${imageName}`, imageBuffer);
                }
            }
        });

        // Generate the zip buffer
        const zipBuffer = zip.toBuffer();

        const headers = {
            'Content-Type': 'application/zip',
            'Content-Length': zipBuffer.length,
            'Content-Disposition': `attachment; filename="${test.title}_scorm.zip"`
        };

        res.set(headers);
        return res.send(zipBuffer);

    } catch (error) {
        console.error('Error in SCORM generation:', error);
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: "Failed to generate SCORM package",
                error: error.message
            });
        }
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

function generateContentHtml(test, questions) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${test.title}</title>
    <script src="scorm_api.js"></script>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
        }
        .question { 
            margin-bottom: 30px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .question img {
            max-width: 100%;
            height: auto;
            margin: 10px 0;
        }
        .answers {
            margin-left: 20px;
        }
        .answer {
            margin: 10px 0;
        }
        button {
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        button:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <h1>${test.title}</h1>
    <div id="test-info">
        <p>Time Limit: ${test.time_limit} minutes</p>
        <p>Passing Score: ${test.passing_score}%</p>
    </div>
    <form id="quiz-form">
        ${questions.map((question, index) => {
            const answers = question.answers ? question.answers.split('||').map(a => {
                const [id, content, isCorrect] = a.split('::');
                return { id, content, isCorrect: isCorrect === '1' };
            }) : [];
            
            return `
                <div class="question">
                    <h3>Question ${index + 1}</h3>
                    <p>${question.content}</p>
                    ${question.photo_path ? 
                        `<img src="images/${path.basename(question.photo_path)}" alt="Question image">` 
                        : ''}
                    <div class="answers">
                        ${answers.map((answer, aIndex) => `
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
        <button type="submit">Submit Test</button>
    </form>
    <script>
        // Initialize SCORM
        initializeSCORM();
        
        document.getElementById('quiz-form').onsubmit = function(e) {
            e.preventDefault();
            // Calculate score logic here
            submitSCORMScore(85); // Example score
            return false;
        };
    </script>
</body>
</html>
    `;
}

function generateImsManifest(test) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" 
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          identifier="MANIFEST-${Date.now()}"
          version="1.2">
    <metadata>
        <schema>ADL SCORM</schema>
        <schemaversion>1.2</schemaversion>
    </metadata>
    <organizations default="DEFAULT">
        <organization identifier="DEFAULT">
            <title>${test.title}</title>
            <item identifier="ITEM_1" identifierref="RESOURCE_1">
                <title>${test.title}</title>
            </item>
        </organization>
    </organizations>
    <resources>
        <resource identifier="RESOURCE_1" type="webcontent" adlcp:scormtype="sco" href="index.html">
            <file href="index.html"/>
            <file href="scorm_api.js"/>
        </resource>
    </resources>
</manifest>`;
}

function generateScormLogic(test) {
    return `
// Basic SCORM API Implementation
let initialized = false;
let score = 0;
let complete = false;

function initializeSCORM() {
    if (window.parent && window.parent.API) {
        window.API = window.parent.API;
    }
    
    if (window.API) {
        window.API.LMSInitialize("");
        initialized = true;
        window.API.LMSSetValue("cmi.core.score.min", "0");
        window.API.LMSSetValue("cmi.core.score.max", "100");
        window.API.LMSCommit("");
    }
}

function submitSCORMScore(scoreValue) {
    if (initialized && window.API) {
        window.API.LMSSetValue("cmi.core.score.raw", scoreValue);
        window.API.LMSSetValue("cmi.core.lesson_status", "completed");
        window.API.LMSFinish("");
    }
}

window.onunload = function() {
    if (initialized && window.API) {
        window.API.LMSFinish("");
    }
};
    `;
}

module.exports = { generateTestSCORM };