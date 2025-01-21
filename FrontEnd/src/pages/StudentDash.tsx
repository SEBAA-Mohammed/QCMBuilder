import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  BookOpen,
  Trophy,
  Activity,
  LogOut,
  Moon,
  Sun,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { Test } from "@/types/Test";
import { useUser } from "@/context/userContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../components/theme-context";

interface Stats {
  totalAttempts: number;
  averageScore: number;
  testsCompleted: number;
}

interface TestAttempt {
  id: number;
  test_id: number;
  test_title: string;
  score: number;
  start_time: string;
  end_time: string;
  status: string;
}

const StudentDashboard = () => {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  
  if (!user) {
    navigate("/login");
  }
  if(user?.role !== "student") {
    navigate("/dashboard");
  }

  const [availableTests, setAvailableTests] = useState<Test[]>([]);
  const [testHistory, setTestHistory] = useState<TestAttempt[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState<Stats>({
    totalAttempts: 0,
    averageScore: 0,
    testsCompleted: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const handleLogout = () => {
    setUser(null);
    navigate("/login");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const handleStartTest = (testId: number , teacher_id : number) => {
    navigate(`/take-test/${testId}/${teacher_id}`);
  };

  const filteredTests = availableTests.filter(test =>
    test.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        // Fetch student stats
        const statsResponse = await axios.get(
          `http://localhost:5000/api/student/stats?studentId=${user.id}`
        );
        // Fetch available tests
        const testsResponse = await axios.get(
          `http://localhost:5000/api/student/available-tests`
        );
        // Fetch test history
        const historyResponse = await axios.get(
          `http://localhost:5000/api/student/test-history?studentId=${user.id}`
        );
        
        setStats(statsResponse.data);
        setAvailableTests(testsResponse.data);
        setTestHistory(historyResponse.data);
        console.log(availableTests);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    fetchData();
  }, [user]);

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">Student Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 font-bold">
            Welcome, {user?.full_name.toUpperCase()}
          </p>
        </div>
        <div className="flex gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="w-10 h-10"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <BookOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttempts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tests Completed</CardTitle>
            <Trophy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.testsCompleted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Activity className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Available Tests */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold">Available Tests</CardTitle>
            <div className="relative w-64">
              <Input
                type="text"
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8"
              />
              <Search className="w-4 h-4 absolute right-3 top-3 text-gray-500" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTests.length === 0 ? (
              <p className="py-4 text-center text-gray-500 dark:text-gray-400 col-span-2">
                No available tests found
              </p>
            ) : (
              filteredTests.map((test) => (
                <div
                  key={test.id}
                  className="p-4 border dark:border-gray-700 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{test.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {test.time_limit} mins
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Passing Score: {test.passing_score}%
                  </p>
                  <Button
                    onClick={() => handleStartTest(test.id , test.teacher_id)}
                    className="w-full"
                  >
                    Start Test
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Test History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testHistory.length === 0 ? (
              <p className="py-4 text-center text-gray-500 dark:text-gray-400">
                No test attempts yet
              </p>
            ) : (
              testHistory.map((attempt) => (
                <div
                  key={attempt.id}
                  className="p-4 border dark:border-gray-700 rounded-lg"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{attempt.test_title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Completed on {formatDate(attempt.end_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                      {(attempt.score ?? 0).toFixed(1)}%

                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {attempt.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;