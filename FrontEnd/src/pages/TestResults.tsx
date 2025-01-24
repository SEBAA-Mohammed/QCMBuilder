import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from "@/context/userContext";
import { Moon, Sun, ArrowLeft, LogOut, CheckCircle, XCircle } from "lucide-react";
import { useTheme } from "@/components/theme-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TestResult {
  attempt_id: number;
  student_name: string;
  student_email: string;
  score: number;
  passing_score: number;
  start_time: string;
  end_time: string;
  result_status: 'Pass' | 'Fail';
}

const TestResults: React.FC = () => {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const [results, setResults] = useState<TestResult[]>([]);
  const [testTitle, setTestTitle] = useState<string>('');
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = () => {
    setUser(null);
    navigate("/login");
  };

  // Move authentication checks outside of render logic
  useEffect(() => {
    // Redirect if not authenticated or not a teacher
    if (!user) {
      navigate("/login");
      return;
    }
    if (user?.role !== "teacher") {
      navigate("/login");
      return;
    }

    const fetchTestResults = async () => {
      try {
        // Fetch test results
        const resultsResponse = await fetch(`http://localhost:5000/api/tests/${testId}/results`);
        const resultsData = await resultsResponse.json();
        
        // Fetch test details to get the title
        const testResponse = await fetch(`http://localhost:5000/api/tests/${testId}`);
        const testData = await testResponse.json();

        if (resultsResponse.ok && testResponse.ok) {
          setResults(resultsData.results);
          setTestTitle(testData.test.title);
        } else {
          throw new Error('Failed to fetch data');
        }
      } catch (error) {
        console.error("Error fetching test results:", error);
      }
    };

    fetchTestResults();
  }, [user, navigate, testId]);

  // Redirect if not authenticated
  if (!user || user.role !== "teacher") {
    return null;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">Test Results: {testTitle}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Student Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-center text-gray-500">No test attempts found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Passing Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow 
                    key={result.attempt_id} 
                    className={result.result_status === 'Pass' 
                      ? 'bg-green-50 dark:bg-green-900/20' 
                      : 'bg-red-50 dark:bg-red-900/20'}
                  >
                    <TableCell>{result.student_name}</TableCell>
                    <TableCell>{result.student_email}</TableCell>
                    <TableCell>{(Number(result.score) || 0).toFixed(1)}%</TableCell>
                    <TableCell>{result.passing_score}%</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {result.result_status === 'Pass' ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-green-800 font-semibold">Passed</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-red-600" />
                            <span className="text-red-800 font-semibold">Failed</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(result.end_time).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestResults;