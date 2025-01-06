const getTeacherStats = async (req, res) => {
    try {
      const teacherId = req.user.id; // Assuming you have user authentication
      const totalTests = await Test.count({ where: { teacher_id: teacherId } });
      const activeStudents = await User.count({ where: { role: 'student', is_active: true } });
      const averageScore = await TestAttempt.findAll({
        where: { teacher_id: teacherId },
        attributes: [[sequelize.fn('AVG', sequelize.col('score')), 'averageScore']]
      });
  
      res.json({
        totalTests,
        activeStudents,
        averageScore: averageScore[0].dataValues.averageScore || 0
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  const getTeacherTests = async (req, res) => {
    try {
      const teacherId = req.user.id; // Assuming you have user authentication
      const tests = await Test.findAll({ where: { teacher_id: teacherId } });
      res.json(tests);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  module.exports = {
    getTeacherStats,
    getTeacherTests
  };