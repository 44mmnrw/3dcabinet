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
        Schema::create('cabinet_configurations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->onDelete('cascade');
            $table->integer('width'); // мм
            $table->integer('height'); // мм
            $table->integer('depth'); // мм
            $table->integer('units'); // количество юнитов (U)
            $table->decimal('unit_height', 8, 2); // мм
            $table->decimal('max_weight', 8, 2); // кг
            $table->decimal('max_power', 8, 2); // Вт
            $table->enum('installation', ['floor', 'wall'])->default('floor');
            $table->enum('location', ['indoor', 'outdoor'])->default('indoor');
            $table->json('equipment_positions')->nullable(); // Позиции оборудования в шкафу
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cabinet_configurations');
    }
};
