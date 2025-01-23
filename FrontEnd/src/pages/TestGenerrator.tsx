import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Loader2, AlertTriangle, LogOut } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUser } from '@/context/userContext';

const AITestGenerator = () => {
    const navigate = useNavigate();
  const { user, setUser } = useUser();
//   const teacherid = user.id;
  if (!user) {
    navigate("/login");
  }
  if (user?.role !== "teacher") {
    navigate("/studentDashboard");
  }
  const handleLogout = () => {
    setUser(null);
    navigate("/login");
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [testDetails, setTestDetails] = useState({
    title: "",
    description: "",
    time_limit: 60,
    passing_score: 60,
    is_randomized: false,
    attempts_allowed: 1,
    topic: "",
    difficulty: ""
  });

  const validateForm = () => {
    const errors = [];
    if (!testDetails.title.trim()) errors.push("Test title is required");
    if (!testDetails.description.trim()) errors.push("Test description is required");
    if (testDetails.time_limit <= 0) errors.push("Time limit must be greater than 0");
    if (testDetails.passing_score < 0 || testDetails.passing_score > 100) {
      errors.push("Passing score must be between 0 and 100");
    }
    if (!testDetails.topic.trim()) errors.push("Topic is required");
    if (!testDetails.difficulty) errors.push("Difficulty level is required");
    
    setError(errors.join(", "));
    return errors.length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError("");

    try {
      // First, create the test (using your existing createTest endpoint)
      const createTestResponse = await fetch("http://localhost:5000/api/tests", {
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
          status: "draft"
        }),
      });

      if (!createTestResponse.ok) throw new Error("Failed to create test");
      
      const { testId } = await createTestResponse.json();

      // Then, generate questions
      const generateResponse = await fetch("http://localhost:5000/api/tests/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          topic: testDetails.topic,
          difficulty: testDetails.difficulty
        }),
      });

      if (!generateResponse.ok) {
        throw new Error("Failed to generate questions");
      }

      const result = await generateResponse.json();
      if (result.success) {
        navigate(`/editTest/${testId}`);
      } else {
        throw new Error(result.message || "Failed to generate questions");
      }

    } catch (error) {
        // @ts-expect-error - error is a string
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };


//   const pollGenerationStatus = async (testId: string) => {
//     const pollInterval = setInterval(async () => {
//       try {
//         const response = await fetch(`http://localhost:5000/api/tests/generation-status/${testId}`);
//         const data = await response.json();

//         if (data.status === 'completed') {
//           clearInterval(pollInterval);
//           setIsLoading(false);
//           navigate(`/editTest/${testId}`);
//         } else if (data.status === 'failed') {
//           clearInterval(pollInterval);
//           setIsLoading(false);
//           setError(data.error_message || 'Generation failed');
//         }
//         // Continue polling if status is 'pending' or 'processing'
        
//       } catch (error) {
//         console.error(error);
//         clearInterval(pollInterval);
//         setIsLoading(false);
//         setError('Error checking generation status');
//       }
//     }, 2000); // Poll every 2 seconds
//   };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create AI-Generated Test</CardTitle>
        </CardHeader>
        <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={(e)=>handleSubmit(e)} className="space-y-4">
            <Input
              placeholder="Test Title"
              value={testDetails.title}
              onChange={(e) => setTestDetails(prev => ({ ...prev, title: e.target.value }))}
            />

            <Textarea
              placeholder="Test Description"
              value={testDetails.description}
              onChange={(e) => setTestDetails(prev => ({ ...prev, description: e.target.value }))}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Time Limit (minutes)</label>
                <Input
                  type="number"
                  value={testDetails.time_limit}
                  onChange={(e) => setTestDetails(prev => ({ ...prev, time_limit: parseInt(e.target.value) }))}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Passing Score (%)</label>
                <Input
                  type="number"
                  value={testDetails.passing_score}
                  onChange={(e) => setTestDetails(prev => ({ ...prev, passing_score: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Randomize Questions</span>
              <Switch
                checked={testDetails.is_randomized}
                onCheckedChange={(checked) => setTestDetails(prev => ({ ...prev, is_randomized: checked }))}
              />
            </div>

            <Input
              placeholder="Topic (e.g., NodeJS Fundamentals, React Hooks)"
              value={testDetails.topic}
              onChange={(e) => setTestDetails(prev => ({ ...prev, topic: e.target.value }))}
            />

            <Select
              value={testDetails.difficulty}
              onValueChange={(value) => setTestDetails(prev => ({ ...prev, difficulty: value }))}
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

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Test...
                </>
              ) : (
                'Create AI Test'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AITestGenerator;