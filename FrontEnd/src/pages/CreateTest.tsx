import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Trash2, PlusCircle, Save, AlertTriangle } from "lucide-react";
import { Question } from "@/types/QuestionAnswer";
import { Moon, Sun, ArrowLeft, LogOut } from "lucide-react";
import { useTheme } from "@/components/theme-context";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/context/userContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Swal from "sweetalert2";

const CreateTest: React.FC = () => {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  if (!user) {
    navigate("/login");
  }

  const [testId, setTestId] = useState<number | null>(null);
  const [testDetails, setTestDetails] = useState({
    title: "",
    description: "",
    time_limit: 60,
    passing_score: 60,
    is_randomized: false,
    attempts_allowed: 1,
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [questionValidationErrors, setQuestionValidationErrors] = useState<
    string[]
  >([]);

  const validateTestDetails = () => {
    const errors: string[] = [];

    if (!testDetails.title.trim()) {
      errors.push("Test title is required");
    }
    if (!testDetails.description.trim()) {
      errors.push("Test description is required");
    }
    if (testDetails.time_limit <= 0) {
      errors.push("Time limit must be greater than 0");
    }
    if (testDetails.passing_score < 0 || testDetails.passing_score > 100) {
      errors.push("Passing score must be between 0 and 100");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const validateQuestion = () => {
    const errors: string[] = [];

    if (!currentQuestion.content.trim()) {
      errors.push("Question content is required");
    }

    const filledAnswers = currentQuestion.answers.filter((a) =>
      a.content.trim()
    );
    if (filledAnswers.length < 2) {
      errors.push("At least two answer options are required");
    }

    const hasCorrectAnswer = currentQuestion.answers.some((a) => a.is_correct);
    if (!hasCorrectAnswer) {
      errors.push("At least one correct answer must be selected");
    }

    setQuestionValidationErrors(errors);
    return errors.length === 0;
  };

  const [fileInputKey, setFileInputKey] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState({
    content: "",
    type: "one-correct-choice",
    points: 1,
    photo_path: null,
    answers: [
      { content: "", is_correct: false },
      { content: "", is_correct: false },
    ],
  });
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  const handleLogout = () => {
    setUser(null);
    navigate("/login");
  };

  // Create initial test
  const createTest = async () => {
    if (!validateTestDetails()) return;

    try {
      const response = await fetch("http://localhost:5000/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...testDetails,
          user: user,
          status: "draft",
        }),
      });

      if (!response.ok) throw new Error("Failed to create test");

      const data = await response.json();
      setTestId(data.testId);
      setValidationErrors([]);
      const toast = Swal.mixin({
                          toast: true,
                          position: "bottom-end",
                          showConfirmButton: false,
                          timer: 3000,
                          padding: "2em",
                          timerProgressBar: true,
                          
                      });
                      toast.fire({
                          icon: "success",
                          title: "Test Created , you can add questions now",
                          padding: "2em",
                      });
    } catch (error) {
      console.error("Error creating test:", error);
      setValidationErrors(["Failed to create test. Please try again."]);
    }
  };

  // Add answer option to current question
  const addAnswer = () => {
    setCurrentQuestion((prev) => ({
      ...prev,
      answers: [...prev.answers, { content: "", is_correct: false }],
    }));
  };

  // Remove answer option from current question
  const removeAnswer = (index: number) => {
    setCurrentQuestion((prev) => ({
      ...prev,
      answers: prev.answers.filter((_, i) => i !== index),
    }));
  };

  // Save question to database
  const saveQuestion = async () => {
    if (!testId) return;
    if (!validateQuestion()) return;

    try {
      const formData = new FormData();
      formData.append("content", currentQuestion.content);
      formData.append("type", currentQuestion.type);
      formData.append("points", currentQuestion.points.toString());
      formData.append("order_num", (questions.length + 1).toString());
      formData.append("answers", JSON.stringify(currentQuestion.answers));

      if (currentQuestion.photo_path) {
        const response = await fetch(currentQuestion.photo_path);
        const blob = await response.blob();
        formData.append("photo", blob, "question-image.jpg");
      }

      const response = await fetch(
        `http://localhost:5000/api/tests/${testId}/questions`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Failed to save question");

      const data = await response.json();
      setQuestions((prev) => [...prev, data]);
      setCurrentQuestion({
        content: "",
        type: "one-correct-choice",
        points: 1,
        photo_path: null,
        answers: [
          { content: "", is_correct: false },
          { content: "", is_correct: false },
        ],
      });
      setFileInputKey((prev) => prev + 1);
      setQuestionValidationErrors([]);
      const toast = Swal.mixin({
                          toast: true,
                          position: "bottom-end",
                          showConfirmButton: false,
                          timer: 3000,
                          padding: "2em",
                          timerProgressBar: true,
                          
                      });
                      toast.fire({
                          icon: "success",
                          title: "Question added to test",
                          padding: "2em",
                      });
    } catch (error) {
      console.error("Error saving question:", error);
      setQuestionValidationErrors([
        "Failed to save question. Please try again.",
      ]);
    }
  };

  // Delete question and reorder remaining questions
  const deleteQuestion = async (questionId: number, orderNum: number) => {
    if (!testId) return;

    try {
      const deleteResponse = await fetch(
        `http://localhost:5000/api/tests/${testId}/questions/${questionId}`,
        {
          method: "DELETE",
        }
      );

      if (!deleteResponse.ok) throw new Error("Failed to delete question");

      // Update order numbers for remaining questions
      const updatedQuestions = questions
        .filter((q) => q.id !== questionId)
        .map((q) => ({
          ...q,
          order_num: q.order_num > orderNum ? q.order_num - 1 : q.order_num,
        }));

      // Update order numbers in database
      await Promise.all(
        updatedQuestions.map((q) =>
          fetch(`http://localhost:5000/api/tests/${testId}/questions/${q.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              order_num: q.order_num,
            }),
          })
        )
      );

      setQuestions(updatedQuestions);
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">Create Test</h1>
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

      {/* Test Details Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Details</CardTitle>
        </CardHeader>
        <CardContent>
          {validationErrors.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            <Input
              placeholder="Test Title"
              value={testDetails.title}
              onChange={(e) => {
                setTestDetails((prev) => ({
                  ...prev,
                  title: e.target.value,
                }));
                validateTestDetails();
              }}
            />

            <Textarea
              placeholder="Test Description"
              value={testDetails.description}
              onChange={(e) => {
                setTestDetails((prev) => ({
                  ...prev,
                  description: e.target.value,
                }));
                validateTestDetails();
              }}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">
                  Time Limit (minutes)
                </label>
                <Input
                  type="number"
                  value={testDetails.time_limit}
                  onChange={(e) => {
                    setTestDetails((prev) => ({
                      ...prev,
                      time_limit: parseInt(e.target.value),
                    }));
                    validateTestDetails();
                  }}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Passing Score (%)</label>
                <Input
                  type="number"
                  value={testDetails.passing_score}
                  onChange={(e) => {
                    setTestDetails((prev) => ({
                      ...prev,
                      passing_score: parseInt(e.target.value),
                    }));
                    validateTestDetails();
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Randomize Questions</span>
              <Switch
                checked={testDetails.is_randomized}
                onCheckedChange={(checked) => {
                  setTestDetails((prev) => ({
                    ...prev,
                    is_randomized: checked,
                  }));
                  validateTestDetails();
                }}
              />
            </div>

            {!testId && (
              <Button
                className="w-full"
                onClick={createTest}
                disabled={validationErrors.length > 0}
              >
                Create Test
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {testId && (
        <>
          {/* Question List */}
          <div className="space-y-4 mb-6">
            {questions.map((question, index) => (
              <Card key={question.id}>
                <CardContent className="flex justify-between items-center p-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="font-bold mr-2">Q{index + 1}:</span>
                      {question.content}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      deleteQuestion(question.id, question.order_num)
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add New Question */}
          <Card>
            <CardHeader>
              <CardTitle>Add New Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questionValidationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc pl-4">
                      {questionValidationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              <Textarea
                placeholder="Question content"
                value={currentQuestion.content}
                onChange={(e) =>{
                  setCurrentQuestion((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }));
                  validateQuestion();
                }
                  
                }
              />

              {/* Add this new image input section */}
              <div className="space-y-2">
                <label className="block text-sm">Question Image</label>
                <Input
                  key={fileInputKey}
                  type="file"
                  id="photo"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        // @ts-expect-error - base64 is a string
                        setCurrentQuestion((prev) => ({
                          ...prev,
                          photo_path: reader.result as string,
                        }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {currentQuestion.photo_path && (
                  <div className="mt-2">
                    <img
                      src={currentQuestion.photo_path}
                      alt="Question preview"
                      className="max-h-40 object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {currentQuestion.answers.map((answer, index) => (
                  <div key={index} className="flex gap-4 items-center">
                    <Input
                      placeholder={`Answer ${index + 1}`}
                      value={answer.content}
                      onChange={(e) => {
                        const newAnswers = [...currentQuestion.answers];
                        newAnswers[index].content = e.target.value;
                        setCurrentQuestion((prev) => ({
                          ...prev,
                          answers: newAnswers,
                        }));
                        validateQuestion();
                      }}
                    />
                    <Switch
                      checked={answer.is_correct}
                      onCheckedChange={(checked) => {
                        const newAnswers = [...currentQuestion.answers];
                        if (currentQuestion.type === "one-correct-choice") {
                          newAnswers.forEach((a) => (a.is_correct = false));
                        }
                        newAnswers[index].is_correct = checked;
                        setCurrentQuestion((prev) => ({
                          ...prev,
                          answers: newAnswers,
                        }));
                        validateQuestion();
                      }}
                    />
                    {currentQuestion.answers.length > 2 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeAnswer(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={addAnswer}
                  className="w-full"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Answer Option
                </Button>
              </div>

              <Button
                onClick={saveQuestion}
                className="w-full"
                disabled={questionValidationErrors.length > 0}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Question
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
export default CreateTest;
