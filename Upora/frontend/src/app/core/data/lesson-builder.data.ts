import { Lesson, ContentOutput, StageType, SubStageType } from '../models/lesson.model';

export const MOCK_CONTENT_OUTPUTS: ContentOutput[] = [
    {
        id: 101,
        name: "Glossophobia Q&A Pairs",
        processType: "Extract Key Q&A Pairs",
        source: { name: "Stage Fright Research.docx", type: 'file' },
        data: [
            { id: 1, q: "What is glossophobia?", a: "Glossophobia, or the fear of public speaking, is a common social phobia characterized by anxiety when speaking in front of an audience." },
            { id: 2, q: "What are common symptoms?", a: "Symptoms include increased heart rate, sweating, trembling, nausea, and a desire to flee the situation." },
        ]
    },
    {
        id: 102,
        name: "Famous Speeches Summary",
        processType: "Summarize Sections",
        source: { name: "https://en.wikipedia.org/wiki/Rhetoric", type: 'link' },
        data: "A summary of key rhetorical devices used in famous historical speeches, focusing on ethos, pathos, and logos."
    },
    {
        id: 103,
        name: "Audience Analysis Facts",
        processType: "Extract Key Facts",
        source: { name: "Public Speaking 101.pdf", type: 'file' },
        data: [
            "Fact 1: Understanding audience demographics (age, gender, education) is crucial.",
            "Fact 2: Psychographics (values, beliefs, attitudes) provide deeper insights.",
            "Fact 3: The context of the speech (time, location, occasion) heavily influences reception."
        ]
    }
];

export const SAMPLE_LESSON: Lesson = {
  id: 1000,
  title: 'The Art of Public Speaking',
  description: 'A comprehensive guide to becoming a confident and effective public speaker.',
  thumbnailUrl: 'https://picsum.photos/400/225?random=1000',
  stages: [
    {
      id: 2000,
      title: 'Overcoming Stage Fright',
      type: 'Trigger' as StageType,
      subStages: [
        { id: 3000, title: 'What is Glossophobia?', type: 'Tease' as SubStageType, interactionType: 'Provocative Poll', duration: 5, script: [], contentOutputId: 101 },
        { id: 3001, title: 'Your Speaking Experience', type: 'Evoke' as SubStageType, interactionType: 'Memory Prompt Card', duration: 10, script: [] },
        { id: 3010, title: 'Famous Speeches Analysis', type: 'Ignite' as SubStageType, interactionType: 'Teaser Video Clip', duration: 8, script: [], contentOutputId: 102 },
      ]
    },
    {
        id: 2003,
        title: 'Understanding Your Audience',
        type: 'Explore' as StageType,
        subStages: [
          { id: 3006, title: 'Audience Demographics', type: 'Uncover' as SubStageType, interactionType: 'Data Exploration Map', duration: 15, script: [], contentOutputId: 103 },
          { id: 3007, title: 'Tracking Commonalities', type: 'Track' as SubStageType, interactionType: 'Pattern Matching Puzzle', duration: 10, script: [] },
          { id: 3008, title: 'Noodling on Motivations', type: 'Noodle' as SubStageType, interactionType: 'Voice Hypothesis Recorder', duration: 12, script: [] },
        ]
    },
    {
      id: 2001,
      title: 'Crafting Your Message',
      type: 'Absorb' as StageType,
      subStages: [
        { id: 3002, title: 'Showing the Power of Three', type: 'Show' as SubStageType, interactionType: 'Animated Explainer Video', duration: 15, script: [] },
        { id: 3003, title: 'Interpreting Your Outline', type: 'Interpret' as SubStageType, interactionType: 'Concept Map Builder', duration: 20, script: [] },
        { id: 3009, title: 'Connecting with Parallels', type: 'Parallel' as SubStageType, interactionType: 'Analogy Matching Game', duration: 10, script: [] },
      ]
    },
    {
        id: 2002,
        title: 'Delivery Techniques',
        type: 'Cultivate' as StageType,
        subStages: [
          { id: 3004, title: 'Getting a Grip on Vocal Variety', type: 'Grip' as SubStageType, interactionType: 'Flashcard Drill', duration: 10, script: [] },
          { id: 3005, title: 'Repurposing for Q&A Scenarios', type: 'Repurpose' as SubStageType, interactionType: 'Role-Play Simulator', duration: 15, script: [] },
          { id: 3011, title: 'Originating an Impromptu Topic', type: 'Originate' as SubStageType, interactionType: 'Brainstorm Board', duration: 18, script: [] },
        ]
    },
    {
        id: 2004,
        title: 'Final Presentation',
        type: 'Hone' as StageType,
        subStages: [
          { id: 3012, title: 'Verifying Key Concepts', type: 'Verify' as SubStageType, interactionType: 'Recall Quiz', duration: 10, script: [] },
          { id: 3013, title: 'Self-Evaluation', type: 'Evaluate' as SubStageType, interactionType: 'Self-Assessment Rubric', duration: 20, script: [] },
          { id: 3014, title: 'Targeting Your Action Plan', type: 'Target' as SubStageType, interactionType: 'Goal-Setting Tracker', duration: 15, script: [] },
        ]
    }
  ]
};

export const INTERACTION_TYPES = [
    { stage: 'Trigger', subStage: 'Tease', name: 'Provocative Poll' },
    { stage: 'Trigger', subStage: 'Tease', name: 'Teaser Video Clip' },
    { stage: 'Trigger', subStage: 'Ignite', name: 'Surprise Quiz Teaser' },
    { stage: 'Trigger', subStage: 'Ignite', name: 'Interactive Demo GIF' },
    { stage: 'Trigger', subStage: 'Evoke', name: 'Memory Prompt Card' },
    { stage: 'Trigger', subStage: 'Evoke', name: 'Association Word Cloud' },
    { stage: 'Explore', subStage: 'Handle', name: 'Drag-and-Drop Simulator' },
    { stage: 'Explore', subStage: 'Handle', name: 'Virtual Experiment Builder' },
    { stage: 'Explore', subStage: 'Uncover', name: 'Guided Question Branch' },
    { stage: 'Explore', subStage: 'Uncover', name: 'Data Exploration Map' },
    { stage: 'Explore', subStage: 'Noodle', name: 'Voice Hypothesis Recorder' },
    { stage: 'Explore', subStage: 'Noodle', name: 'Prediction Slider Game' },
    { stage: 'Explore', subStage: 'Track', name: 'Anomaly Highlight Tool' },
    { stage: 'Explore', subStage: 'Track', name: 'Pattern Matching Puzzle' },
    { stage: 'Absorb', subStage: 'Interpret', name: 'Paraphrase Generator' },
    { stage: 'Absorb', subStage: 'Interpret', name: 'Concept Map Builder' },
    { stage: 'Absorb', subStage: 'Show', name: 'Animated Explainer Video' },
    { stage: 'Absorb', subStage: 'Show', name: 'Interactive Infographic' },
    { stage: 'Absorb', subStage: 'Parallel', name: 'Analogy Matching Game' },
    { stage: 'Absorb', subStage: 'Parallel', name: 'Story Bridge Prompt' },
    { stage: 'Cultivate', subStage: 'Grip', name: 'Flashcard Drill' },
    { stage: 'Cultivate', subStage: 'Grip', name: 'Timed Problem Solver' },
    { stage: 'Cultivate', subStage: 'Repurpose', name: 'Scenario Twister' },
    { stage: 'Cultivate', subStage: 'Repurpose', name: 'Role-Play Simulator' },
    { stage: 'Cultivate', subStage: 'Originate', name: 'Open-Ended Creator' },
    { stage: 'Cultivate', subStage: 'Originate', name: 'Brainstorm Board' },
    { stage: 'Cultivate', subStage: 'Work', name: 'Feedback Revision Loop' },
    { stage: 'Cultivate', subStage: 'Work', name: 'Version Comparison Diff' },
    { stage: 'Hone', subStage: 'Verify', name: 'Recall Quiz' },
    { stage: 'Hone', subStage: 'Verify', name: 'Memory Matrix Grid' },
    { stage: 'Hone', subStage: 'Evaluate', name: 'Self-Assessment Rubric' },
    { stage: 'Hone', subStage: 'Evaluate', name: 'Gap Identification Journal' },
    { stage: 'Hone', subStage: 'Target', name: 'Goal-Setting Tracker' },
    { stage: 'Hone', subStage: 'Target', name: 'Action Roadmap Map' },
];
