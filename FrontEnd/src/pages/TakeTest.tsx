import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Timer, AlertCircle } from "lucide-react";
import axios from "axios";
import { useUser } from "@/context/userContext";

interface Question {
  id: number;
  content: string;
  type: string;
  points: number;
  photo_path: string | null;
  answers: Answer[];
}

interface Answer {
  id: number;
  content: string;
}

interface TestData {
  id: number;
  title: string;
  description: string;
  time_limit: number;
  is_randomized: boolean;
  questions: Question[];
}

const TakeTest: React.FC = () => {
  const { testId, teacherId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  if (!user) {
    navigate("/login");
  }
  if (user?.role !== "student") {
    navigate("/dashboard");
  }

  const [testData, setTestData] = useState<TestData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    score: number;
    status: string;
    message: string;
    testTitle: string;
    passingScore: number;
  } | null>(null);

  useEffect(() => {
    // Basic validation checks
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role !== "student") {
      navigate("/dashboard");
      return;
    }

    // Initialize test data
    const initializeTest = async () => {
      if (!user?.id || !testId || attemptId) return; // Skip if already initialized

      try {
        setLoading(true);

        // First get the test details
        const testResponse = await axios.get(
          `http://localhost:5000/api/tests/edit?testId=${testId}&teacherId=${teacherId}`
        );
        const test = testResponse.data;

        try {
          // Then start the attempt
          const response = await axios.post(
            `http://localhost:5000/api/student/test-attempts/start`,
            {
              studentId: user.id,
              testId,
            }
          );

          const { attemptId: newAttemptId, questions } = response.data;

          let processedQuestions = questions;
          if (test.is_randomized) {
            processedQuestions = [...questions].sort(() => Math.random()*10);
            console.log(processedQuestions);
          }

          setTestData({
            ...test,
            questions: processedQuestions,
          });
          setAttemptId(newAttemptId);
          setTimeRemaining(Number(test.test.time_limit) * 60);
          console.log(test.test.time_limit);
          console.log(timeRemaining);
        } catch (err) {
          if (axios.isAxiosError(err) && err.response?.status === 409) {
            // If there's an existing attempt, redirect to dashboard
            setError("You already have an active attempt for this test.");
            navigate("/studentDashboard");
            return;
          }
          throw err; // Re-throw other errors
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load test");
      } finally {
        setLoading(false);
      }
    };

    initializeTest();
  }, [user, testId, teacherId, navigate, attemptId]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleAnswerSelect = (questionId: number, answerId: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerId,
    }));
  };
  useEffect(() => {
    if (!testData || timeRemaining <= 0) return;

    // Initialize time remaining once based on testData if it's not set yet
    if (timeRemaining === null) {
      setTimeRemaining(testData.time_limit * 60);
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup on component unmount or when timeRemaining reaches 0
    return () => clearInterval(timer);
  }, [timeRemaining, testData]); // Run the effect when timeRemaining or testData changes

  const handleTimeUp = async () => {
    setShowTimeUpDialog(true);
    await submitTest(true);
  };

  const submitTest = async (isTimeUp: boolean = false) => {
    try {
      const answers = Object.entries(selectedAnswers).map(
        ([questionId, answerId]) => ({
          questionId: parseInt(questionId),
          selectedAnswerId: answerId,
        })
      );

      const response = await axios.post(
        `http://localhost:5000/api/student/test-attempts/submit`,
        {
          attemptId,
          answers,
        }
      );

      setSubmissionResult(response.data);
      setShowScoreDialog(true);

      // If time's up, don't show the score dialog immediately
      if (!isTimeUp) {
        setShowTimeUpDialog(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit test");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  if (error)
    return (
      <div className="flex justify-center items-center h-screen">
        Error: {error}
      </div>
    );
  if (!testData) return null;

  const currentQuestion = testData.questions[currentQuestionIndex];
  const progress =
    (Object.keys(selectedAnswers).length / testData.questions.length) * 100;

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{testData.title}</h1>
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            <span
              className={`font-mono text-lg ${
                timeRemaining <= 60 ? "text-red-500" : "text-primar"
              }`}
            >
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-sm text-gray-500 mt-2">
          <span>
            Question {currentQuestionIndex + 1} of {testData.questions.length}
          </span>
          <span>{Math.round(progress)}% completed</span>
        </div>
      </div>

      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{currentQuestion.content}</CardTitle>
        </CardHeader>
        <CardContent>
          {currentQuestion.photo_path && (
            <img
              // Remove /public from the URL since Express is already configured to serve from public/uploads
              src={`http://localhost:5000${currentQuestion.photo_path}`}
              alt="Question"
              className="mb-4 max-w-full rounded-lg"
              onError={(e) => {
                console.error("Image failed to load:", e);
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <RadioGroup
            value={selectedAnswers[currentQuestion.id]?.toString()}
            onValueChange={(value: string) =>
              handleAnswerSelect(currentQuestion.id, parseInt(value))
            }
            className="space-y-3"
          >
            {currentQuestion.answers.map((answer) => (
              <div key={answer.id} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={answer.id.toString()}
                  id={`answer-${answer.id}`}
                />
                <Label htmlFor={`answer-${answer.id}`} className="flex-1">
                  {answer.content}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentQuestionIndex === testData.questions.length - 1 ? (
          <Button
            onClick={() => setShowConfirmSubmit(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            Submit Test
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
            disabled={currentQuestionIndex === testData.questions.length - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {Object.keys(selectedAnswers).length} out of{" "}
              {testData.questions.length} questions. Are you sure you want to
              submit your test?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitTest()}>
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Score Dialog */}
      <AlertDialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {submissionResult?.testTitle} - Test Results
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p
                className={`text-lg font-semibold ${
                  submissionResult?.status === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {submissionResult?.message}
              </p>
              <div className="mt-4 text-sm text-gray-600">
                <p>Score: {submissionResult?.score}%</p>
                <p>Passing Score: {submissionResult?.passingScore}%</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => navigate("/studentDashboard")}>
              Return to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Time Up Dialog */}
      <AlertDialog open={showTimeUpDialog} onOpenChange={setShowTimeUpDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Time's Up!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your time has expired. Your test has been automatically submitted.
              {submissionResult && (
                <div className="mt-4">
                  <p
                    className={`font-semibold ${
                      submissionResult.status === "success"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {submissionResult.message}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => navigate("/studentDashboard")}>
              Return to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TakeTest;
