import { configureStore } from '@reduxjs/toolkit';
import projectsReducer from './slices/projectsSlice';
import subscriptionReducer from './slices/subscriptionSlice';
import freemiumReducer from './slices/freemiumSlice';
import deploymentReducer from './slices/deploymentSlice';
import cyclesReducer from './slices/cyclesSlice';

export const store = configureStore({
    reducer: {
        projects: projectsReducer,
        subscription: subscriptionReducer,
        freemium: freemiumReducer,
        deployments: deploymentReducer,
        cycles: cyclesReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 