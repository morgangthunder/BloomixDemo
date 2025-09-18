import React from 'react';
import type { StageType, SubStageType } from '../types';

interface TypeChipProps {
    type: StageType | SubStageType | string;
    className?: string;
}

const TYPE_COLORS: Record<string, string> = {
    // Stage Types
    Launch: 'bg-blue-500/20 text-blue-300',
    Explore: 'bg-purple-500/20 text-purple-300',
    Absorb: 'bg-green-500/20 text-green-300',
    Refine: 'bg-yellow-500/20 text-yellow-300',
    Nail: 'bg-red-500/20 text-red-300',
    // Sub-stage types can have more generic colors or share parent colors
    Tease: 'bg-blue-500/20 text-blue-300',
    Ignite: 'bg-blue-500/20 text-blue-300',
    Evoke: 'bg-blue-500/20 text-blue-300',
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