import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  progress: {
    [courseId: string]: {
      completedTopics: string[];
      topicScores: Record<string, number>;
    };
  };
  loading: boolean;
}

const initialState: UserState = {
  progress: {},
  loading: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserProgress: (state, action: PayloadAction<UserState['progress']>) => {
      state.progress = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setUserProgress, setLoading } = userSlice.actions;
export default userSlice.reducer;
