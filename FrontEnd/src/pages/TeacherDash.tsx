import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  BookOpen,
  Users,
  Activity,
  LogOut,
  Moon,
  Sun,
  Trash2,
  Stars,
  Download,
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu";
import axios from "axios";
import { Test } from "@/types/Test";
import { useUser } from "@/context/userContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../components/theme-context";
import Swal from "sweetalert2";
import TestDocument from "@/components/PdfGeneration";
import { Question } from "@/types/QuestionAnswer";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from 'file-saver';


interface Stats {
  totalTests: number;
  activeStudents: number;
  averageScore: number;
}

const TeacherDashboard = () => {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  if (!user) {
    navigate("/login");
  }
  if (user?.role !== "teacher") {
    navigate("/studentDashboard");
  }

  const [tests, setTests] = useState<Test[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalTests: 0,
    activeStudents: 0,
    averageScore: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const handleLogout = () => {
    setUser(null);
    navigate("/login");
  };
  const handleDownload = async (testId : number) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/tests/edit?testId=${testId}&teacherId=${user?.id}`
      );
      const data = await response.json();
      
      if (data.success) {
        await handleDownloadPDF(data.test, data.questions);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

    const handleDownloadPDF = async (test: Test, questions: Question[]) => {
    try {
      // Generate PDF blob
      const blob = await pdf(
        <TestDocument test={test} questions={questions} />
      ).toBlob();
      
      // Save the PDF file
      saveAs(blob, `${test.title}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };
  // const [isLoading, setIsLoading] = useState(false);

const handleDownloadHTML = async (testId : number ,title : string) => {
  // setIsLoading(true);
  try {
    const response = await fetch(
      `http://localhost:5000/api/tests/${testId}/html`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}_html.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

  } catch (error) {
    console.error('Error downloading SCORM package:', error);
    // Add your error handling here, e.g., showing a toast notification
  } finally {
    // setIsLoading(false);
  }
};
const handleDownloadSCORM = async (testId : number ,title : string) => {
  // setIsLoading(true);
  try {
    const response = await fetch(
      `http://localhost:5000/api/tests/${testId}/scorm`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}_scorm.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

  } catch (error) {
    console.error('Error downloading SCORM package:', error);
    // Add your error handling here, e.g., showing a toast notification
  } finally {
    // setIsLoading(false);
  }
};
  const handleDeleteTest = async (testId: number) => {
    Swal.fire({
      title: "Are you sure you want to delete this?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#0f172a",
      confirmButtonText: "Yes",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`http://localhost:5000/api/tests/${testId}`);
          setTests(tests.filter((test) => test.id !== testId));
          setStats((prevStats) => ({
            ...prevStats,
            totalTests: prevStats.totalTests - 1,
          }));
        } catch (err) {
          // @ts-expect-error just a string err
          setError(err.message);
        }
        Swal.fire({
          title: "Deleted!",
          confirmButtonColor:"#0f172a",
          text: "Your test has been deleted.",
          icon: "success",
        });
      }
    });
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

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const statsResponse = await axios.get(
          `http://localhost:5000/api/teacher/stats?teacherId=${user.id}`
        );
        const testsResponse = await axios.get(
          `http://localhost:5000/api/teacher/tests?teacherId=${user.id}`
        );
        setStats(statsResponse.data);
        setTests(testsResponse.data);
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
  const handleDownloadd = (testId : number,testTitle : string, type : string) => {
    switch(type) {
      case 'pdf':
        handleDownload(testId);
        break;
      case 'html':
        handleDownloadHTML(testId,testTitle)
        break;
      case 'scorm':
        handleDownloadSCORM(testId,testTitle)
      break;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
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
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            className="flex items-center gap-2"
            onClick={() => navigate("/create-test", { state: { user } })}
          >
            <PlusCircle className="w-4 h-4" />
            Create New Test
          </Button>
          <Button 
            onClick={() => navigate('/createAITest')} 
            className="flex items-center gap-2"
          >
            <Stars className="w-4 h-4" />
            Generate Test with AI
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
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <BookOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Students
            </CardTitle>
            <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Activity className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(Number(stats.averageScore) || 0).toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tests */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Recent Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tests.length === 0 ? (
              <p className="py-4 text-center text-gray-500 dark:text-gray-400 col-span-2">
                No tests created yet
              </p>
            ) : (
              tests.map((test: Test) => (
                <div
                  key={test.id}
                  className="p-4 border dark:border-gray-700 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-medium">{test.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {test.status} • {formatDate(test.created_at)}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={() => navigate(`/edit-test/${test.id}`)}
                        variant="outline"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Download className="mr-2 h-4 w-4" /> Download
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleDownloadd(test.id,test.title, 'pdf')}>
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadd(test.id,test.title, 'scorm')}>
                            Download SCORM
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadd(test.id,test.title, 'html')}>
                            Download HTML
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="outline" size="sm">
                        Publish
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteTest(test.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
