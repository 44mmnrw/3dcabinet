<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cabinet extends Model
{
    protected $fillable = [
        'name',
        'display_name',
        'category',
        'dimensions',
        'specs',
        'thermal',
        'climate',
        'mounting_capabilities',
        'mounting_zones',
        'class_name',
        'module_path',
        'thumbnail_path',
        'description',
        'is_active'
    ];

    protected $casts = [
        'dimensions' => 'array',
        'specs' => 'array',
        'thermal' => 'array',
        'climate' => 'array',
        'mounting_capabilities' => 'array',
        'mounting_zones' => 'array',
        'is_active' => 'boolean'
    ];

    /**
     * Получить путь к папке компонентов FreeCAD
     */
    public function getFreecadFolderPath(): string
    {
        return public_path("assets/models/freecad/{$this->name}");
    }

    /**
     * Получить путь к классу шкафа
     */
    public function getClassFolderPath(): string
    {
        return public_path("js/cabinets/{$this->class_name}");
    }

    /**
     * Scope для активных шкафов
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope для фильтрации по категории
     */
    public function scopeCategory($query, $category)
    {
        return $query->where('category', $category);
    }
}

