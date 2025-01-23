const express = require("express");
const router = express.Router();
const testController = require("../controllers/testController");
const multer = require("multer");
const path = require("path");
const generateTestScorm = require("../controllers/generateTestScorm");
const { generateTestHTML } = require("../controllers/generateTestHtml");
const aiTestController = require("../controllers/AiTestGenrator");

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/questions");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "question-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Not an image! Please upload an image."), false);
    }
  },
});

// Test routes
router.post("/", testController.createTest);
router.get("/", testController.getTests);
router.get("/edit", testController.getTestById);
router.get("/:testId/scorm", generateTestScorm.generateTestSCORM);
router.get("/:testId/html", generateTestHTML);
router.get("/:testId", testController.getTestByIdS);

router.post("/generate-questions", aiTestController.generateAndAddQuestions);
router.get(
  "/generation-status/:testId",
  aiTestController.checkGenerationStatus
);

router.put("/:id", testController.updateTest);
router.delete("/:id", testController.deleteTest);

// Question routes
router.post(
  "/:testId/questions",
  upload.single("photo"),
  testController.addQuestion
);
router.put("/:testId/questions/:questionId", testController.updateQuestion);
router.delete("/:testId/questions/:questionId", testController.deleteQuestion);
router.put(
  "/:testId/questions/:questionId/order",
  testController.updateQuestionOrder
);

module.exports = router;
