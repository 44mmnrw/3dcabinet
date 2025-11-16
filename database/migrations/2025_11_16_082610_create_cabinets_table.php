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
        Schema::create('cabinets', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // TS_700_500_250, tsh_1200_800_400
            $table->string('display_name'); // "Термошкаф 700×500×250"
            $table->string('category')->default('thermal'); // thermal, telecom, server
            $table->json('dimensions'); // {width, height, depth} в мм
            $table->json('specs')->nullable(); // {maxPower, maxLoad, ...}
            $table->json('thermal')->nullable(); // {heatingPower, coolingPower, operatingTemp}
            $table->json('climate')->nullable(); // {ip, hasHeater, hasFans}
            $table->json('mounting_capabilities')->nullable(); // ['din_rail', 'mounting_plate']
            $table->json('mounting_zones')->nullable(); // [{type, componentNames}]
            $table->string('class_name'); // TS_700_500_250
            $table->string('module_path'); // /js/cabinets/TS_700_500_250/TS_700_500_250.js
            $table->string('thumbnail_path')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index('category');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cabinets');
    }
};
