import type { Lesson, StageType, SubStage } from '../types';

export const STAGE_TYPES = ['Launch', 'Explore', 'Absorb', 'Refine', 'Nail'] as const;

export const SUB_STAGE_TYPES_MAP: Record<StageType, readonly string[]> = {
  Launch: ['Tease', 'Ignite', 'Evoke'],
  Explore: ['Tinker', 'Investigate', 'Ponder', 'Spot'],
  Absorb: ['Articulate', 'Present', 'Tie'],
  Refine: ['Practice', 'Adapt', 'Challenge', 'Evolve'],
  Nail: ['Retrieve', 'Evaluate', 'Project'],
};

const ensureSubStageScripts = (stages: any[]): any[] => {
    return stages.map(stage => ({
        ...stage,
        // FIX: Changed type from Omit<SubStage, 'script'> to Partial<SubStage> to allow checking for an existing 'script' property before defaulting to an empty array.
        subStages: stage.subStages.map((ss: Partial<SubStage>) => ({
            ...ss,
            script: ss.script || [],
        }))
    }));
}

export const SAMPLE_LESSON: Lesson = {
  id: 1000,
  title: 'The Art of Public Speaking',
  description: 'A comprehensive guide to becoming a confident and effective public speaker.',
  thumbnailUrl: 'https://picsum.photos/400/225?random=1000',
  stages: [
    {
      id: 2000,
      title: 'Overcoming Stage Fright',
      type: 'Launch',
      subStages: [
        { id: 3000, title: 'What is Glossophobia?', type: 'Tease', interactionType: 'Provocative Poll', duration: 5, script: [] },
        { id: 3001, title: 'Your Speaking Experience', type: 'Evoke', interactionType: 'Memory Prompt Card', duration: 10, script: [] },
        { id: 3010, title: 'Famous Speeches Analysis', type: 'Ignite', interactionType: 'Teaser Video Clip', duration: 8, script: [] },
      ]
    },
    {
        id: 2003,
        title: 'Understanding Your Audience',
        type: 'Explore',
        subStages: [
          { id: 3006, title: 'Audience Demographics', type: 'Investigate', interactionType: 'Data Exploration Map', duration: 15, script: [] },
          { id: 3007, title: 'Spotting Commonalities', type: 'Spot', interactionType: 'Pattern Matching Puzzle', duration: 10, script: [] },
          { id: 3008, title: 'Hypothesize Motivations', type: 'Ponder', interactionType: 'Voice Hypothesis Recorder', duration: 12, script: [] },
        ]
    },
    {
      id: 2001,
      title: 'Crafting Your Message',
      type: 'Absorb',
      subStages: [
        { id: 3002, title: 'The Power of Three', type: 'Present', interactionType: 'Animated Explainer Video', duration: 15, script: [] },
        { id: 3003, title: 'Building Your Outline', type: 'Articulate', interactionType: 'Concept Map Builder', duration: 20, script: [] },
        { id: 3009, title: 'Connecting with Analogies', type: 'Tie', interactionType: 'Analogy Matching Game', duration: 10, script: [] },
      ]
    },
    {
        id: 2002,
        title: 'Delivery Techniques',
        type: 'Refine',
        subStages: [
          { id: 3004, title: 'Vocal Variety Drill', type: 'Practice', interactionType: 'Flashcard Drill', duration: 10, script: [] },
          { id: 3005, title: 'Handling Q&A Scenarios', type: 'Adapt', interactionType: 'Role-Play Simulator', duration: 15, script: [] },
          { id: 3011, title: 'The Impromptu Challenge', type: 'Challenge', interactionType: 'Brainstorm Board', duration: 18, script: [] },
        ]
    },
    {
        id: 2004,
        title: 'Final Presentation',
        type: 'Nail',
        subStages: [
          { id: 3012, title: 'Key Concepts Recall', type: 'Retrieve', interactionType: 'Recall Quiz', duration: 10, script: [] },
          { id: 3013, title: 'Self-Evaluation', type: 'Evaluate', interactionType: 'Self-Assessment Rubric', duration: 20, script: [] },
          { id: 3014, title: 'Your Action Plan', type: 'Project', interactionType: 'Goal-Setting Tracker', duration: 15, script: [] },
        ]
    }
  ]
};

export const INTERACTION_TYPES = [
    { stage: 'Launch', subStage: 'Tease', name: 'Provocative Poll' },
    { stage: 'Launch', subStage: 'Tease', name: 'Teaser Video Clip' },
    { stage: 'Launch', subStage: 'Ignite', name: 'Surprise Quiz Teaser' },
    { stage: 'Launch', subStage: 'Ignite', name: 'Interactive Demo GIF' },
    { stage: 'Launch', subStage: 'Evoke', name: 'Memory Prompt Card' },
    { stage: 'Launch', subStage: 'Evoke', name: 'Association Word Cloud' },
    { stage: 'Explore', subStage: 'Tinker', name: 'Drag-and-Drop Simulator' },
    { stage: 'Explore', subStage: 'Tinker', name: 'Virtual Experiment Builder' },
    { stage: 'Explore', subStage: 'Investigate', name: 'Guided Question Branch' },
    { stage: 'Explore', subStage: 'Investigate', name: 'Data Exploration Map' },
    { stage: 'Explore', subStage: 'Ponder', name: 'Voice Hypothesis Recorder' },
    { stage: 'Explore', subStage: 'Ponder', name: 'Prediction Slider Game' },
    { stage: 'Explore', subStage: 'Spot', name: 'Anomaly Highlight Tool' },
    { stage: 'Explore', subStage: 'Spot', name: 'Pattern Matching Puzzle' },
    { stage: 'Absorb', subStage: 'Articulate', name: 'Paraphrase Generator' },
    { stage: 'Absorb', subStage: 'Articulate', name: 'Concept Map Builder' },
    { stage: 'Absorb', subStage: 'Present', name: 'Animated Explainer Video' },
    { stage: 'Absorb', subStage: 'Present', name: 'Interactive Infographic' },
    { stage: 'Absorb', subStage: 'Tie', name: 'Analogy Matching Game' },
    { stage: 'Absorb', subStage: 'Tie', name: 'Story Bridge Prompt' },
    { stage: 'Refine', subStage: 'Practice', name: 'Flashcard Drill' },
    { stage: 'Refine', subStage: 'Practice', name: 'Timed Problem Solver' },
    { stage: 'Refine', subStage: 'Adapt', name: 'Scenario Twister' },
    { stage: 'Refine', subStage: 'Adapt', name: 'Role-Play Simulator' },
    { stage: 'Refine', subStage: 'Challenge', name: 'Open-Ended Creator' },
    { stage: 'Refine', subStage: 'Challenge', name: 'Brainstorm Board' },
    { stage: 'Refine', subStage: 'Evolve', name: 'Feedback Revision Loop' },
    { stage: 'Refine', subStage: 'Evolve', name: 'Version Comparison Diff' },
    { stage: 'Nail', subStage: 'Retrieve', name: 'Recall Quiz' },
    { stage: 'Nail', subStage: 'Retrieve', name: 'Memory Matrix Grid' },
    { stage: 'Nail', subStage: 'Evaluate', name: 'Self-Assessment Rubric' },
    { stage: 'Nail', subStage: 'Evaluate', name: 'Gap Identification Journal' },
    { stage: 'Nail', subStage: 'Project', name: 'Goal-Setting Tracker' },
    { stage: 'Nail', subStage: 'Project', name: 'Action Roadmap Map' },
];