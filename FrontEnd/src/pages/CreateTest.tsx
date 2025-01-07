import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Trash2, PlusCircle, Save } from "lucide-react";
import { Question } from '@/types/QuestionAnswer';
import { useLocation } from 'react-router-dom';
import { User } from '@/types/User';




const CreateTest: React.FC = () => {
    const location = useLocation();
    const { user } = location.state as { user : User }; // Adjust the type as needed
  
  const [testId, setTestId] = useState<number | null>(null);
  const [testDetails, setTestDetails] = useState({
    title: '',
    description: '',
    time_limit: 60,
    passing_score: 60,
    is_randomized: false,
    attempts_allowed: 1
  });
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState({
    content: '',
    type: 'one-correct-choice',
    points: 1,
    answers: [
      { content: '', is_correct: false },
      { content: '', is_correct: false }
    ]
  });

  // Create initial test
  const createTest = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...testDetails,
          user: user,
          status: 'draft'
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create test');
      
      const data = await response.json();
      setTestId(data.testId);
    } catch (error) {
      console.error('Error creating test:', error);
    }
  };

  // Add answer option to current question
  const addAnswer = () => {
    setCurrentQuestion(prev => ({
      ...prev,
      answers: [...prev.answers, { content: '', is_correct: false }]
    }));
  };

  // Remove answer option from current question
  const removeAnswer = (index : number) => {
    setCurrentQuestion(prev => ({
      ...prev,
      answers: prev.answers.filter((_, i) => i !== index)
    }));
  };

  // Save question to database
  const saveQuestion = async () => {
    if (!testId) return;

    try {
      const response = await fetch(`http://localhost:5000/api/tests/${testId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...currentQuestion,
          order_num: questions.length + 1
        }),
      });
      
      if (!response.ok) throw new Error('Failed to save question');
      
      const data = await response.json();
      setQuestions(prev => [...prev, data]);
      setCurrentQuestion({
        content: '',
        type: 'one-correct-choice',
        points: 1,
        answers: [
          { content: '', is_correct: false },
          { content: '', is_correct: false }
        ]
      });
    } catch (error) {
      console.error('Error saving question:', error);
    }
  };

  // Delete question and reorder remaining questions
  const deleteQuestion = async (questionId: number, orderNum: number) => {
    if (!testId) return;

    try {
      const deleteResponse = await fetch(`http://localhost:5000/api/tests/${testId}/questions/${questionId}`, {
        method: 'DELETE',
      });
      
      if (!deleteResponse.ok) throw new Error('Failed to delete question');
      
      // Update order numbers for remaining questions
      const updatedQuestions = questions
        .filter(q => q.id !== questionId)
        .map(q => ({
          ...q,
          order_num: q.order_num > orderNum ? q.order_num - 1 : q.order_num
        }));
      
      // Update order numbers in database
      await Promise.all(updatedQuestions.map(q => 
        fetch(`http://localhost:5000/api/tests/${testId}/questions/${q.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_num: q.order_num
          }),
        })
      ));
      
      setQuestions(updatedQuestions);
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Create New Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Test Title"
              value={testDetails.title}
              onChange={(e) => setTestDetails(prev => ({
                ...prev,
                title: e.target.value
              }))}
            />
            
            <Textarea
              placeholder="Test Description"
              value={testDetails.description}
              onChange={(e) => setTestDetails(prev => ({
                ...prev,
                description: e.target.value
              }))}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Time Limit (minutes)</label>
                <Input
                  type="number"
                  value={testDetails.time_limit}
                  onChange={(e) => setTestDetails(prev => ({
                    ...prev,
                    time_limit: parseInt(e.target.value)
                  }))}
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1">Passing Score (%)</label>
                <Input
                  type="number"
                  value={testDetails.passing_score}
                  onChange={(e) => setTestDetails(prev => ({
                    ...prev,
                    passing_score: parseInt(e.target.value)
                  }))}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Randomize Questions</span>
              <Switch
                checked={testDetails.is_randomized}
                onCheckedChange={(checked) => setTestDetails(prev => ({
                  ...prev,
                  is_randomized: checked
                }))}
              />
            </div>
            
            {!testId && (
              <Button 
                className="w-full" 
                onClick={createTest}
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
                  <div>
                    <span className="font-bold mr-2">Q{index + 1}:</span>
                    {question.content}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteQuestion(question.id, question.order_num)}
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
              <Textarea
                placeholder="Question content"
                value={currentQuestion.content}
                onChange={(e) => setCurrentQuestion(prev => ({
                  ...prev,
                  content: e.target.value
                }))}
              />
              
              <div className="space-y-4">
                {currentQuestion.answers.map((answer, index) => (
                  <div key={index} className="flex gap-4 items-center">
                    <Input
                      placeholder={`Answer ${index + 1}`}
                      value={answer.content}
                      onChange={(e) => {
                        const newAnswers = [...currentQuestion.answers];
                        newAnswers[index].content = e.target.value;
                        setCurrentQuestion(prev => ({
                          ...prev,
                          answers: newAnswers
                        }));
                      }}
                    />
                    <Switch
                      checked={answer.is_correct}
                      onCheckedChange={(checked) => {
                        const newAnswers = [...currentQuestion.answers];
                        if (currentQuestion.type === 'one-correct-choice') {
                          newAnswers.forEach(a => a.is_correct = false);
                        }
                        newAnswers[index].is_correct = checked;
                        setCurrentQuestion(prev => ({
                          ...prev,
                          answers: newAnswers
                        }));
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