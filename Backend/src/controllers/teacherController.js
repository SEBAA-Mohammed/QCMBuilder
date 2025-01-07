const pool = require("../config/database");

const getTeacherStats = async (req, res) => {
  const { teacherId } = req.query;

  try {
    const [totalTests] = await pool.query(
      "SELECT COUNT(*) AS totalTests FROM tests WHERE teacher_id = ?",
      [teacherId]
    );
    const [activeStudents] = await pool.query(
      'SELECT COUNT(*) AS activeStudents FROM users WHERE role = "student" AND is_active = 1'
    );
    const [averageScore] = await pool.query(
      "SELECT AVG(score) AS averageScore FROM test_attempts WHERE test_id IN (SELECT id FROM tests WHERE teacher_id = ?)",
      [teacherId]
    );

    res.json({
      totalTests: totalTests[0].totalTests,
      activeStudents: activeStudents[0].activeStudents,
      averageScore: averageScore[0].averageScore || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const getTeacherTests = async (req, res) => {
  const { teacherId } = req.query;

  try {
    const [tests] = await pool.query(
      "SELECT * FROM tests WHERE teacher_id = ?",
      [teacherId]
    );
    res.json(tests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getTeacherStats,
  getTeacherTests,
};
