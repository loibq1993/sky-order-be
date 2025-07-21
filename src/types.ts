export interface Category {
    id: string;
    name: string;
    nameKo?: string;
    icon: string;
    description?: string;
    descriptionKo?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface MenuItem {
    id: string;
    name: string;
    nameKo?: string;
    addName?: string;
    addNameKo?: string;
    price: number;
    description: string;
    descriptionKo?: string;
    image: string;
    categoryId: string;
    category: string;
    categoryKo?: string;
    available: boolean;
    sales: number;
    statusKey: string;
    count: number;
    createdAt: Date;
    updatedAt: Date;
} 