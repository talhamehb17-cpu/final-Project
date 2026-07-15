-- Reviews (homepage)
create table if not exists reviews (
  id serial primary key,
  name text not null,
  text text not null,
  rating int not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

-- Products
create table if not exists products (
  id serial primary key,
  product_name text not null,
  category text not null,
  price numeric(10,2) not null,
  old_price numeric(10,2),
  image text,
  images jsonb not null default '[]'::jsonb, -- up to 3 URLs/paths (array of strings)
  colors jsonb not null default '[]'::jsonb, -- selectable variants (array of strings)
  description text,
  sizes text, -- store as comma-separated or JSON string
  stock int not null default 0
);

-- Wishlist (user-specific)
create table if not exists wishlists (
  user_id text not null,
  product_id int not null references products(id) on delete cascade,
  product_name text,
  price numeric(10,2),
  image text,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- Cart (user-specific)
create table if not exists cart_items (
  user_id text not null,
  product_id int not null references products(id) on delete cascade,
  quantity int not null check (quantity >= 1),
  product_name text,
  price numeric(10,2),
  image text,
  color text,
  size text,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- Orders (COD)
create table if not exists orders (
  order_id bigserial primary key,
  user_id text not null,
  total_amount numeric(12,2) not null,
  payment_method text not null default 'COD',
  status text not null default 'pending',
  customer_name text,
  customer_email text,
  phone text,
  shipping_address jsonb,
  subtotal numeric(12,2),
  discount_total numeric(12,2),
  shipping numeric(12,2),
  tax numeric(12,2),
  estimated_delivery_date date,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id bigserial primary key,
  order_id bigint not null references orders(order_id) on delete cascade,
  product_id int not null references products(id),
  quantity int not null check (quantity >= 1),
  price numeric(10,2) not null,
  product_name text,
  image text,
  old_price numeric(10,2),
  unit_price numeric(10,2),
  color text,
  size text
);

