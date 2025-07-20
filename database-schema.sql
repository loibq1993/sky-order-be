-- Database Schema for VIỆT PHỐ Food Ordering System
-- MySQL/PostgreSQL compatible
-- Users table (for admin authentication)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(20) DEFAULT 'admin',
    -- admin, staff
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Menu items table
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    add_name VARCHAR(200),
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    image_url TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE
    SET NULL,
        available BOOLEAN DEFAULT true,
        sales_count INTEGER DEFAULT 0,
        status_key VARCHAR(50) DEFAULT 'menu-item-status',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Payment sessions table (for grouping orders by payment)
CREATE TABLE payment_sessions (
    id SERIAL PRIMARY KEY,
    session_key VARCHAR(100) UNIQUE NOT NULL,
    -- table_1_2024-12-01 or ship_0123456789_2024-12-01
    table_number VARCHAR(20),
    customer_phone VARCHAR(20),
    customer_name VARCHAR(100),
    customer_address TEXT,
    order_type VARCHAR(20) NOT NULL,
    -- table, takeaway, ship
    total_amount DECIMAL(10, 2) DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    -- active, paid, cancelled
    payment_method VARCHAR(20),
    -- cash, bank, momo, zalopay, vnpay
    payment_status VARCHAR(20) DEFAULT 'pending',
    -- pending, completed, failed
    payment_reference VARCHAR(100),
    -- transaction ID, order number
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL
);
-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    payment_session_id INTEGER REFERENCES payment_sessions(id) ON DELETE CASCADE,
    table_number VARCHAR(20),
    order_type VARCHAR(20) NOT NULL,
    -- table, takeaway, ship
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, confirmed, preparing, ready, completed, cancelled
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    customer_address TEXT,
    payment_method VARCHAR(20),
    payment_status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL
);
-- Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE
    SET NULL,
        item_name VARCHAR(200) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        quantity INTEGER NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Order status history table (for tracking status changes)
CREATE TABLE order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    notes TEXT,
    changed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Payment history table
CREATE TABLE payment_history (
    id SERIAL PRIMARY KEY,
    payment_session_id INTEGER REFERENCES payment_sessions(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_reference VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Device sessions table (for tracking active sessions)
CREATE TABLE device_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    table_number VARCHAR(20),
    device_info TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Indexes for better performance
CREATE INDEX idx_orders_payment_session ON orders(payment_session_id);
CREATE INDEX idx_orders_table_number ON orders(table_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_payment_sessions_session_key ON payment_sessions(session_key);
CREATE INDEX idx_payment_sessions_table_number ON payment_sessions(table_number);
CREATE INDEX idx_payment_sessions_customer_phone ON payment_sessions(customer_phone);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(available);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_device_sessions_table ON device_sessions(table_number);
CREATE INDEX idx_device_sessions_active ON device_sessions(is_active);
-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';
CREATE TRIGGER update_users_updated_at BEFORE
UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE
UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE
UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_sessions_updated_at BEFORE
UPDATE ON payment_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE
UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Sample data
INSERT INTO users (username, password_hash, email, role)
VALUES (
        'admin',
        '$2b$10$hashed_password_here',
        'admin@vietpho.com',
        'admin'
    );
INSERT INTO categories (name, icon, description, sort_order)
VALUES ('Popular', '🔥', 'Most popular items', 1),
    ('Chè', '🍮', 'Vietnamese sweet soups', 2),
    ('Sữa Chua', '🥛', 'Yogurt-based desserts', 3),
    ('Caramen', '🍮', 'Caramel desserts', 4),
    ('Matcha', '🍵', 'Green tea items', 5),
    ('Khác', '🍰', 'Other items', 6);
-- Insert sample menu items (you can add more)
INSERT INTO menu_items (
        name,
        add_name,
        price,
        description,
        image_url,
        category_id,
        sales_count
    )
VALUES (
        'RAU CÂU LÁ NẾP CARAMEN',
        'RAU CÂU LÁ NẾP CARAMEN',
        24000,
        'Rau câu lá nếp thơm ngon với caramen đậm đà',
        'https://example.com/image1.jpg',
        4,
        45
    ),
    (
        'Bánh Caramen Truyền Thống',
        'Bánh Caramen Truyền Thống',
        8000,
        'Bánh caramen theo công thức truyền thống',
        'https://example.com/image2.jpg',
        4,
        67
    ),
    (
        'CHÈ SẦU RIÊNG ĐẶC BIỆT',
        'CHÈ SẦU RIÊNG ĐẶC BIỆT',
        35000,
        'Chè sầu riêng với topping đặc biệt',
        'https://example.com/image3.jpg',
        2,
        23
    );