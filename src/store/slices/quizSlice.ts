import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Question {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  tags: string[];
}

interface QuizState {
  currentQuiz: {
    topicId: string | null;
    courseId: string | null;
    isFinalQuiz: boolean;
    questions: Question[];
    currentQuestionIndex: number;
    answers: Record<string, string>;
    markedForReview: number[];
    timeStarted: number | null;
    timeElapsed: number;
  };
  quizResult: {
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    timeTaken: number;
  } | null;
}

const initialState: QuizState = {
  currentQuiz: {
    topicId: null,
    courseId: null,
    isFinalQuiz: false,
    questions: [],
    currentQuestionIndex: 0,
    answers: {},
    markedForReview: [],
    timeStarted: null,
    timeElapsed: 0,
  },
  quizResult: null,
};

const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    startQuiz: (state, action: PayloadAction<{ topicId: string | null; courseId: string; isFinalQuiz: boolean; questions: Question[] }>) => {
      state.currentQuiz = {
        topicId: action.payload.topicId,
        courseId: action.payload.courseId,
        isFinalQuiz: action.payload.isFinalQuiz,
        questions: action.payload.questions,
        currentQuestionIndex: 0,
        answers: {},
        markedForReview: [],
        timeStarted: Date.now(),
        timeElapsed: 0,
      };
      state.quizResult = null;
    },
    answerQuestion: (state, action: PayloadAction<{ questionId: string; answer: string }>) => {
      state.currentQuiz.answers[action.payload.questionId] = action.payload.answer;
    },
    markForReview: (state, action: PayloadAction<number>) => {
      const index = action.payload;
      if (state.currentQuiz.markedForReview.includes(index)) {
        state.currentQuiz.markedForReview = state.currentQuiz.markedForReview.filter(i => i !== index);
      } else {
        state.currentQuiz.markedForReview.push(index);
      }
    },
    setCurrentQuestion: (state, action: PayloadAction<number>) => {
      state.currentQuiz.currentQuestionIndex = action.payload;
    },
    updateTimeElapsed: (state, action: PayloadAction<number>) => {
      state.currentQuiz.timeElapsed = action.payload;
    },
    submitQuiz: (state, action: PayloadAction<{ score: number; totalQuestions: number; correctAnswers: number; timeTaken: number }>) => {
      state.quizResult = action.payload;
    },
    resetQuiz: (state) => {
      state.currentQuiz = initialState.currentQuiz;
      state.quizResult = null;
    },
  },
});

export const {
  startQuiz,
  answerQuestion,
  markForReview,
  setCurrentQuestion,
  updateTimeElapsed,
  submitQuiz,
  resetQuiz,
} = quizSlice.actions;

export default quizSlice.reducer;
