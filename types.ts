
export type QuestionType = 'multiple-choice' | 'fill-in-the-blank';

export interface Question {
  question: string;
  options: string[];
  answer: string;
}

export interface QuizData {
  quiz: Question[];
}

export type Grade = '6' | '7' | '8' | '9';

export interface Unit {
  id: string;
  name: string;
}

export interface GradeData {
  grade: Grade;
  name: string;
  units: Unit[];
}

export interface SavedQuiz {
  quizData: QuizData;
  gradeName: string;
  unitName: string;
}

export type GenerationMode = 'textbook' | 'upload';
