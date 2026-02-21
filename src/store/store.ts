import { configureStore } from '@reduxjs/toolkit';
import quizReducer from './slices/quizSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    quiz: quizReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
