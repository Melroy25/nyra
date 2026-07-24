import { FoodCard } from '../types';

export const mockFoodCards: FoodCard[] = [
  {
    id: 'food-spinach',
    name: 'Leafy Greens Focus (Spinach/Kale)',
    benefits: 'Iron support & blood replenishment',
    category: 'Iron Rich',
    description: 'Incorporate nutrient-dense spinach or kale to support iron intake during your current phase.',
    imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'food-nuts',
    name: 'Nuts & Seeds (Almonds/Pumpkin Seeds)',
    benefits: 'Magnesium support to ease tension',
    category: 'Essential Fats',
    description: 'A handful of almonds or pumpkin seeds provides essential magnesium to ease muscle tension and bloating.',
    imageUrl: 'https://images.unsplash.com/photo-1596560548464-f010689b7f1e?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'food-carbs',
    name: 'Complex Carbs (Oats/Sweet Potatoes)',
    benefits: 'Steady energy levels & mood stabilization',
    category: 'Complex Carbs',
    description: 'Opt for oats or sweet potatoes to maintain steady energy levels and support serotonin synthesis throughout the day.',
    imageUrl: 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?auto=format&fit=crop&q=80&w=400',
  },
];
