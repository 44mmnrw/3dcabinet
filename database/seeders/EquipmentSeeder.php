<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EquipmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $equipment = [
            [
                'name' => 'Сервер 1U',
                'category' => 'Серверы',
                'manufacturer' => 'Dell',
                'model' => 'PowerEdge R340',
                'description' => 'Компактный однопроцессорный сервер для малого бизнеса',
                'units' => 1,
                'weight' => 15.00,
                'power' => 350.00,
                'heat' => 350.00,
                'depth' => 650,
                'price' => 85000.00,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Сервер 2U',
                'category' => 'Серверы',
                'manufacturer' => 'HP',
                'model' => 'ProLiant DL380 Gen10',
                'description' => 'Двухпроцессорный сервер для средних нагрузок',
                'units' => 2,
                'weight' => 25.00,
                'power' => 750.00,
                'heat' => 750.00,
                'depth' => 700,
                'price' => 150000.00,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Коммутатор 1U 24 порта',
                'category' => 'Сетевое оборудование',
                'manufacturer' => 'Cisco',
                'model' => 'Catalyst 2960-24TC-L',
                'description' => 'Управляемый коммутатор 24 порта 10/100/1000',
                'units' => 1,
                'weight' => 5.00,
                'power' => 100.00,
                'heat' => 100.00,
                'depth' => 400,
                'price' => 45000.00,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'ИБП 2U 1500VA',
                'category' => 'Питание',
                'manufacturer' => 'APC',
                'model' => 'Smart-UPS 1500VA',
                'description' => 'Источник бесперебойного питания онлайн',
                'units' => 2,
                'weight' => 20.00,
                'power' => 1500.00,
                'heat' => 150.00,
                'depth' => 600,
                'price' => 95000.00,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Патч-панель 1U 24 порта',
                'category' => 'Кабельная система',
                'manufacturer' => 'Legrand',
                'model' => 'LCS3 CAT6 UTP',
                'description' => 'Патч-панель 24 порта категории 6',
                'units' => 1,
                'weight' => 2.00,
                'power' => 0.00,
                'heat' => 0.00,
                'depth' => 200,
                'price' => 8000.00,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Полка 1U',
                'category' => 'Аксессуары',
                'manufacturer' => 'Generic',
                'model' => 'Fixed Shelf 1U',
                'description' => 'Стационарная полка для размещения оборудования',
                'units' => 1,
                'weight' => 3.00,
                'power' => 0.00,
                'heat' => 0.00,
                'depth' => 450,
                'price' => 3500.00,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Блок розеток PDU 1U',
                'category' => 'Питание',
                'manufacturer' => 'APC',
                'model' => 'Basic Rack PDU',
                'description' => 'Блок распределения питания 8 розеток',
                'units' => 1,
                'weight' => 2.50,
                'power' => 0.00,
                'heat' => 0.00,
                'depth' => 550,
                'price' => 12000.00,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('equipment')->insert($equipment);
    }
}
