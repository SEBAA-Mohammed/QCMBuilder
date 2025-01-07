export interface Answer {
    content: string;
    is_correct: boolean;
  }
  
  export interface Question {
    id: number;
    content: string;
    type: 'multiple-correct-choice' | 'one-correct-choice';
    points: number;
    order_num: number;
    answers: Answer[];
  }