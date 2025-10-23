import React from 'react';
import type { ItemStatus } from '../types';

interface StatusChipProps {
    status: ItemStatus;
}

const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
    const colors: Record<ItemStatus, string> = {
        'Published': 'bg-green-500/20 text-green-300',
        'Pending Approval': 'bg-yellow-500/20 text-yellow-300',
        'Build In Progress': 'bg-blue-500/20 text-blue-300'
    };
    return (
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colors[status]}`}>
            {status}
        </span>
    );
}

export default StatusChip;
