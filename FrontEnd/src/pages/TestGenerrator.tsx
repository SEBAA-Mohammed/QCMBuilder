import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePollinationsText } from "@pollinations/react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  AlertTriangle,
  LogOut,
  Moon,
  Sun,
  ArrowLeft,
  Stars,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUser } from "@/context/userContext";
import { useTheme } from "@/components/theme-context";

const AITestGenerator = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const { theme, setTheme } = useTheme();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [testId, setTestId] = useState<number | null>(null);
  const [triggerAIGeneration, setTriggerAIGeneration] = useState(false);
  const [aiGenerationComplete, setAIGenerationComplete] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);

  const [testDetails, setTestDetails] = useState({
    title: "",
    description: "",
    time_limit: 60,
    passing_score: 60,
    is_randomized: false,
    attempts_allowed: 1,
    topic: "",
    difficulty: "",
  });
  const pollinationOptions = useCallback(
    {
      model: "mistral",
      seed: Math.floor(Math.random() * 1000),
    },
    []
  );

  // Pollinations text generation hook
  const pollinationsResponse = usePollinationsText(
    !aiGenerationComplete &&
      testId &&
      testDetails.topic &&
      testDetails.difficulty
      ? `Create ${numberOfQuestions} multiple-choice questions about ${testDetails.topic} at ${testDetails.difficulty} difficulty. 
        Format each question with:
        Q1: [Question Text]
        A) [Option 1]
        B) [Option 2]
        C) [Option 3]
        D) [Option 4]
        Correct: [Correct Answer Letter]`
      : null,
    pollinationOptions
  );

  const isAILoading = pollinationsResponse?.isLoading || false;

  useEffect(() => {
    if (pollinationsResponse) {
      setAiResponse(pollinationsResponse);
    }
  }, [pollinationsResponse]);

  useEffect(() => {
    console.log(aiResponse);
  }, [aiResponse]);

  const parseAndAddQuestions = async () => {
    console.log("parseAndAddQuestions");
    if (!testId || !aiResponse || aiGenerationComplete) return;
    console.log("parseAndAddQuestions2");
    try {
      const questions = parseAIResponse(aiResponse);

      for (const question of questions) {
        const questionResponse = await fetch(
          `http://localhost:5000/api/tests/${testId}/questions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...question,
              test_id: testId,
            }),
          }
        );

        if (!questionResponse.ok) throw new Error("Failed to add question");
      }

      setAIGenerationComplete(true);
      setIsLoading(false);
      navigate(`/edit-test/${testId}`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
      setIsLoading(false);
      setAIGenerationComplete(true);
    }
  };

  // Use effect to trigger question addition when AI response is ready
  useEffect(() => {
    if (testId && aiResponse && !isAILoading && !aiGenerationComplete) {
      parseAndAddQuestions();
    }
  }, [testId, aiResponse, isAILoading, aiGenerationComplete]);

  // Reset ref when component unmounts or test creation fails

  // Navigation and authentication checks
  useEffect(() => {
    if (!user) navigate("/login");
    if (user?.role !== "teacher") navigate("/login");
  }, [user, navigate]);

  // Use effect to trigger question addition when AI response is ready
  useEffect(() => {
    if (testId && aiResponse && !isAILoading && triggerAIGeneration) {
      parseAndAddQuestions();
      setTriggerAIGeneration(false);
    }
  }, [testId, aiResponse, isAILoading, triggerAIGeneration]);

  // Validate form
  const validateForm = () => {
    const errors = [];
    if (!testDetails.title.trim()) errors.push("Test title is required");
    if (!testDetails.description.trim())
      errors.push("Test description is required");
    if (testDetails.time_limit <= 0)
      errors.push("Time limit must be greater than 0");
    if (testDetails.passing_score < 0 || testDetails.passing_score > 100) {
      errors.push("Passing score must be between 0 and 100");
    }
    if (!testDetails.topic.trim()) errors.push("Topic is required");
    if (!testDetails.difficulty) errors.push("Difficulty level is required");

    setError(errors.join(", "));
    return errors.length === 0;
  };

  // Parse AI response to extract questions
  const parseAIResponse = (text: string) => {
    const questions = [];
    const questionRegex =
      /Q\d+:\s*(.+?)\n(?:A\)\s*(.+?)\n)?(?:B\)\s*(.+?)\n)?(?:C\)\s*(.+?)\n)?(?:D\)\s*(.+?)\n)?Correct:\s*([ABCD])/gs;

    let match;
    while ((match = questionRegex.exec(text)) !== null) {
      const [
        ,
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctAnswer,
      ] = match;

      if (!questionText || !optionA || !optionB || !optionC || !optionD)
        continue;

      const question = {
        content: questionText.trim(),
        type: "one-correct-choice",
        points: 1,
        answers: [
          {
            content: optionA.trim(),
            is_correct: correctAnswer === "A",
            order_num: 1,
          },
          {
            content: optionB.trim(),
            is_correct: correctAnswer === "B",
            order_num: 2,
          },
          {
            content: optionC.trim(),
            is_correct: correctAnswer === "C",
            order_num: 3,
          },
          {
            content: optionD.trim(),
            is_correct: correctAnswer === "D",
            order_num: 4,
          },
        ],
      };

      questions.push(question);
    }

    return questions;
  };

  // Create test handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setAIGenerationComplete(false);

    if (!validateForm()) return;

    setIsLoading(true);
    setError("");

    try {
      const createTestResponse = await fetch(
        "http://localhost:5000/api/tests",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: testDetails.title,
            description: testDetails.description,
            time_limit: testDetails.time_limit,
            passing_score: testDetails.passing_score,
            is_randomized: testDetails.is_randomized,
            attempts_allowed: testDetails.attempts_allowed,
            user: user,
            status: "draft",
          }),
        }
      );

      if (!createTestResponse.ok) throw new Error("Failed to create test");

      const { testId } = await createTestResponse.json();
      setTestId(testId);
      setIsLoading(true);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
      setIsLoading(false);
    }
  };

  // Theme and logout handlers
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = () => {
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">Generate Test with AI</h1>
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
          <CardTitle>AI Test Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Test Title"
              value={testDetails.title}
              onChange={(e) =>
                setTestDetails((prev) => ({ ...prev, title: e.target.value }))
              }
            />

            <Textarea
              placeholder="Test Description"
              value={testDetails.description}
              onChange={(e) =>
                setTestDetails((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">
                  Time Limit (minutes)
                </label>
                <Input
                  type="number"
                  value={testDetails.time_limit}
                  onChange={(e) =>
                    setTestDetails((prev) => ({
                      ...prev,
                      time_limit: parseInt(e.target.value),
                    }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Passing Score (%)</label>
                <Input
                  type="number"
                  value={testDetails.passing_score}
                  onChange={(e) =>
                    setTestDetails((prev) => ({
                      ...prev,
                      passing_score: parseInt(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Randomize Questions</span>
              <Switch
                checked={testDetails.is_randomized}
                onCheckedChange={(checked) =>
                  setTestDetails((prev) => ({
                    ...prev,
                    is_randomized: checked,
                  }))
                }
              />
            </div>

            <Input
              placeholder="Topic (e.g., NodeJS Fundamentals, React Hooks)"
              value={testDetails.topic}
              onChange={(e) =>
                setTestDetails((prev) => ({ ...prev, topic: e.target.value }))
              }
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                value={testDetails.difficulty}
                onValueChange={(value) =>
                  setTestDetails((prev) => ({ ...prev, difficulty: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={numberOfQuestions.toString()}
                onValueChange={(value) => setNumberOfQuestions(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Number of Questions" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(20)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {i + 1} Question{i + 1 > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || triggerAIGeneration}
            >
              {isLoading || (testId && isAILoading) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Test...
                </>
              ) : (
                <>
                  <Stars className="w-4 h-4 mr-2" />
                  Create AI Test
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AITestGenerator;
