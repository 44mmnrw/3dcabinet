<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('equipment', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category');
            $table->string('manufacturer')->nullable();
            $table->string('model')->nullable();
            $table->text('description')->nullable();
            $table->integer('units'); // Количество юнитов (U)
            $table->decimal('weight', 8, 2); // кг
            $table->decimal('power', 8, 2); // Вт
            $table->decimal('heat', 8, 2); // BTU
            $table->integer('depth'); // мм
            $table->decimal('price', 10, 2);
            $table->string('image_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipment');
    }
};
