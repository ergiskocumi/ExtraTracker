import React from 'react';
import {
    FiDollarSign,
    FiHeart,
    FiBook,
    FiBriefcase,
    FiUser,
    FiTarget,
    FiSmile,
    FiMeh,
    FiFrown,
} from 'react-icons/fi';
import type { Mood } from '../types';

export const getCategoryIcon = (category: string): React.ReactElement => {
    const icons: Record<string, React.ReactElement> = {
        finance: <FiDollarSign className="w-6 h-6" />,
        health: <FiHeart className="w-6 h-6" />,
        learning: <FiBook className="w-6 h-6" />,
        career: <FiBriefcase className="w-6 h-6" />,
        personal: <FiUser className="w-6 h-6" />,
    };
    return icons[category] || <FiTarget className="w-6 h-6" />;
};

export const getMoodIcon = (mood: Mood, size: string = 'w-5 h-5'): React.ReactElement => {
    if (mood === 3) return <FiSmile className={`${size} text-green-400`} />;
    if (mood === 2) return <FiMeh className={`${size} text-yellow-400`} />;
    return <FiFrown className={`${size} text-red-400`} />;
};
