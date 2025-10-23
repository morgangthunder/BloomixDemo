import React from 'react';
import type { StageType, SubStageType } from '../types';

interface TypeChipProps {
    type: StageType | SubStageType | string;
    className?: string;
}

const TYPE_COLORS: Record<string, string> = {
    // Stage Types
    Trigger: 'bg-blue-500/20 text-blue-300', // Was Launch
    Explore: 'bg-purple-500/20 text-purple-300',
    Absorb: 'bg-green-500/20 text-green-300',
    Cultivate: 'bg-yellow-500/20 text-yellow-300', // Was Refine
    Hone: 'bg-red-500/20 text-red-300', // Was Nail
    
    // Sub-stage types inherit parent colors
    // Trigger (TIE)
    Tease: 'bg-blue-500/20 text-blue-300',
    Ignite: 'bg-blue-500/20 text-blue-300',
    Evoke: 'bg-blue-500/20 text-blue-300',

    // Explore (HUNT)
    Handle: 'bg-purple-500/20 text-purple-300',
    Uncover: 'bg-purple-500/20 text-purple-300',
    Noodle: 'bg-purple-500/20 text-purple-300',
    Track: 'bg-purple-500/20 text-purple-300',

    // Absorb (SIP)
    Show: 'bg-green-500/20 text-green-300',
    Interpret: 'bg-green-500/20 text-green-300',
    Parallel: 'bg-green-500/20 text-green-300',
    
    // Cultivate (GROW)
    Grip: 'bg-yellow-500/20 text-yellow-300',
    Repurpose: 'bg-yellow-500/20 text-yellow-300',
    Originate: 'bg-yellow-500/20 text-yellow-300',
    Work: 'bg-yellow-500/20 text-yellow-300',

    // Hone (VET)
    Verify: 'bg-red-500/20 text-red-300',
    Evaluate: 'bg-red-500/20 text-red-300',
    Target: 'bg-red-500/20 text-red-300',

    Default: 'bg-gray-500/20 text-gray-300',
};

const TypeChip: React.FC<TypeChipProps> = ({ type, className = '' }) => {
    const colorClass = TYPE_COLORS[type] || TYPE_COLORS.Default;

    return (
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${colorClass} ${className}`}>
            {type}
        </span>
    );
};

export default TypeChip;