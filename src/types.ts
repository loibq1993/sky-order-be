export interface Category {
    id: string;
    name: string;
    icon: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface MenuItem {
    id: string;
    name: string;
    addName?: string;
    price: number;
    description: string;
    image: string;
    categoryId: string;
    category: string;
    available: boolean;
    sales: number;
    statusKey: string;
    count: number;
    createdAt: Date;
    updatedAt: Date;
} 