import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, BookOpen, Users, Activity } from "lucide-react";
import axios from 'axios';
import { Test } from '@/types/Test';
import { useUser } from '@/context/userContext';

interface Stats {
  totalTests: number;
  activeStudents: number;
  averageScore: number;
}

const TeacherDashboard = () => {
    const { user } = useUser();
  const [tests, setTests] = useState<Test[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalTests: 0,
    activeStudents: 0,
    averageScore: 0
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        if (!user) return;
      try {
        const statsResponse = await axios.get(`http://localhost:5000/api/teacher/stats?teacherId=${user.id}`);
        const testsResponse = await axios.get(`http://localhost:5000/api/teacher/tests?teacherId=${user.id}`);
        setStats(statsResponse.data);
        setTests(testsResponse.data);
        console.log(testsResponse.data);
      } catch (err) {
        // @ts-expect-error just a string err
        setError(err.message);
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
        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
        <Button className="flex items-center gap-2">
          <PlusCircle className="w-4 h-4" />
          Create New Test
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <BookOpen className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Activity className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tests */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {tests.length === 0 ? (
              <p className="py-4 text-center text-gray-500">No tests created yet</p>
            ) : (
              tests.map((test: Test) => (
                <div key={test.id} className="py-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{test.title}</h3>
                    <p className="text-sm text-gray-500">
                      {test.status} • {test.created_at}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Edit</Button>
                    <Button variant="outline" size="sm">View Results</Button>
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

export default TeacherDashboard;