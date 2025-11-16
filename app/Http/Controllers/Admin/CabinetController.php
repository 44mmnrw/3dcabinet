<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cabinet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CabinetController extends Controller
{
    /**
     * Список всех шкафов
     */
    public function index()
    {
        $cabinets = Cabinet::latest()->paginate(20);
        return view('admin.cabinets.index', compact('cabinets'));
    }

    /**
     * Форма создания шкафа
     */
    public function create()
    {
        return view('admin.cabinets.create');
    }

    /**
     * Сохранение нового шкафа
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'display_name' => 'required|string|max:255',
            'category' => 'required|in:thermal,telecom,server',
            'width' => 'required|integer|min:1',
            'height' => 'required|integer|min:1',
            'depth' => 'required|integer|min:1',
            'components' => 'required|array',
            'components.*.file' => 'required|file|mimes:json',
            'components.*.name' => 'required|string',
            'description' => 'nullable|string',
            'thumbnail' => 'nullable|image|max:2048',
            
            // Specs
            'max_power' => 'nullable|integer',
            'max_load' => 'nullable|integer',
            
            // Thermal
            'heating_power' => 'nullable|integer',
            'cooling_power' => 'nullable|integer',
            'temp_min' => 'nullable|integer',
            'temp_max' => 'nullable|integer',
            
            // Climate
            'ip_rating' => 'nullable|integer',
            'has_heater' => 'nullable|boolean',
            'has_fans' => 'nullable|boolean',
            
            // Mounting
            'mounting_capabilities' => 'nullable|array',
            'mounting_zones' => 'nullable|array',
        ]);

        try {
            // Генерируем имя шкафа из размеров
            $name = $this->generateCabinetName($validated['width'], $validated['height'], $validated['depth']);
            $className = strtoupper($name);

            // Создаем папку для компонентов
            $freecadPath = public_path("assets/models/freecad/{$name}");
            if (!File::exists($freecadPath)) {
                File::makeDirectory($freecadPath, 0755, true);
            }

            // Сохраняем загруженные JSON-компоненты
            foreach ($request->file('components') as $index => $component) {
                $componentName = $request->input("components.{$index}.name");
                $filename = Str::slug($componentName) . '.json';
                $component['file']->move($freecadPath, $filename);
            }

            // Запускаем Python-генератор класса шкафа (передаём ОТНОСИТЕЛЬНЫЙ путь и отключаем обновление каталога)
            // Генератор ожидает путь относительно корня проекта: public/assets/models/freecad/{name}
            $relativeSource = 'public/assets/models/freecad/' . $name;
            $this->runCabinetGenerator($relativeSource);

            // Сохраняем thumbnail
            $thumbnailPath = null;
            if ($request->hasFile('thumbnail')) {
                $thumbnailPath = $request->file('thumbnail')->store("cabinets/{$name}", 'public');
            }

            // Создаем запись в БД
            $cabinet = Cabinet::create([
                'name' => $name,
                'display_name' => $validated['display_name'],
                'category' => $validated['category'],
                'dimensions' => [
                    'width' => $validated['width'],
                    'height' => $validated['height'],
                    'depth' => $validated['depth']
                ],
                'specs' => [
                    'maxPower' => $validated['max_power'] ?? null,
                    'maxLoad' => $validated['max_load'] ?? null
                ],
                'thermal' => [
                    'heatingPower' => $validated['heating_power'] ?? null,
                    'coolingPower' => $validated['cooling_power'] ?? null,
                    'operatingTemp' => [
                        'min' => $validated['temp_min'] ?? null,
                        'max' => $validated['temp_max'] ?? null
                    ]
                ],
                'climate' => [
                    'ip' => $validated['ip_rating'] ?? null,
                    'hasHeater' => $validated['has_heater'] ?? false,
                    'hasFans' => $validated['has_fans'] ?? false
                ],
                'mounting_capabilities' => $validated['mounting_capabilities'] ?? ['din_rail'],
                'mounting_zones' => $validated['mounting_zones'] ?? [],
                'class_name' => $className,
                'module_path' => "/js/cabinets/{$className}/{$className}.js",
                'thumbnail_path' => $thumbnailPath,
                'description' => $validated['description'],
                'is_active' => true
            ]);

            // Обновляем catalog.json
            $this->updateCatalog($cabinet);

            return redirect()
                ->route('admin.cabinets.index')
                ->with('success', 'Шкаф успешно создан и класс сгенерирован!');

        } catch (\Exception $e) {
            return back()
                ->withInput()
                ->withErrors(['error' => 'Ошибка создания шкафа: ' . $e->getMessage()]);
        }
    }

    /**
     * Форма редактирования шкафа
     */
    public function edit(Cabinet $cabinet)
    {
        return view('admin.cabinets.edit', compact('cabinet'));
    }

    /**
     * Обновление шкафа
     */
    public function update(Request $request, Cabinet $cabinet)
    {
        $validated = $request->validate([
            'display_name' => 'required|string|max:255',
            'category' => 'required|in:thermal,telecom,server',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'thumbnail' => 'nullable|image|max:2048',
            
            // Specs
            'max_power' => 'nullable|integer',
            'max_load' => 'nullable|integer',
            
            // Thermal
            'heating_power' => 'nullable|integer',
            'cooling_power' => 'nullable|integer',
            'temp_min' => 'nullable|integer',
            'temp_max' => 'nullable|integer',
            
            // Climate
            'ip_rating' => 'nullable|integer',
            'has_heater' => 'nullable|boolean',
            'has_fans' => 'nullable|boolean',
        ]);

        try {
            // Обновляем thumbnail
            if ($request->hasFile('thumbnail')) {
                if ($cabinet->thumbnail_path) {
                    Storage::disk('public')->delete($cabinet->thumbnail_path);
                }
                $validated['thumbnail_path'] = $request->file('thumbnail')->store("cabinets/{$cabinet->name}", 'public');
            }

            $cabinet->update([
                'display_name' => $validated['display_name'],
                'category' => $validated['category'],
                'description' => $validated['description'],
                'is_active' => $validated['is_active'] ?? true,
                'thumbnail_path' => $validated['thumbnail_path'] ?? $cabinet->thumbnail_path,
                'specs' => [
                    'maxPower' => $validated['max_power'] ?? null,
                    'maxLoad' => $validated['max_load'] ?? null
                ],
                'thermal' => [
                    'heatingPower' => $validated['heating_power'] ?? null,
                    'coolingPower' => $validated['cooling_power'] ?? null,
                    'operatingTemp' => [
                        'min' => $validated['temp_min'] ?? null,
                        'max' => $validated['temp_max'] ?? null
                    ]
                ],
                'climate' => [
                    'ip' => $validated['ip_rating'] ?? null,
                    'hasHeater' => $validated['has_heater'] ?? false,
                    'hasFans' => $validated['has_fans'] ?? false
                ],
            ]);

            // Обновляем catalog.json
            $this->updateCatalog($cabinet);

            return redirect()
                ->route('admin.cabinets.index')
                ->with('success', 'Шкаф обновлен!');

        } catch (\Exception $e) {
            return back()
                ->withInput()
                ->withErrors(['error' => 'Ошибка обновления: ' . $e->getMessage()]);
        }
    }

    /**
     * Удаление шкафа
     */
    public function destroy(Cabinet $cabinet)
    {
        try {
            // Удаляем папку компонентов
            $freecadPath = $cabinet->getFreecadFolderPath();
            if (File::exists($freecadPath)) {
                File::deleteDirectory($freecadPath);
            }

            // Удаляем папку класса
            $classPath = $cabinet->getClassFolderPath();
            if (File::exists($classPath)) {
                File::deleteDirectory($classPath);
            }

            // Удаляем thumbnail
            if ($cabinet->thumbnail_path) {
                Storage::disk('public')->delete($cabinet->thumbnail_path);
            }

            // Удаляем из catalog.json
            $this->removeFromCatalog($cabinet);

            $cabinet->delete();

            return redirect()
                ->route('admin.cabinets.index')
                ->with('success', 'Шкаф удален!');

        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Ошибка удаления: ' . $e->getMessage()]);
        }
    }

    /**
     * Генерация имени шкафа из размеров
     */
    private function generateCabinetName(int $width, int $height, int $depth): string
    {
        return "tsh_{$width}_{$height}_{$depth}";
    }

    /**
     * Запуск Python-генератора класса шкафа
     */
    private function runCabinetGenerator(string $relativeSourcePath): void
    {
        $pythonPath = 'python'; // или полный путь к python.exe
        $scriptPath = base_path('tools/generate-cabinet-class.py');
        // Передаём относительный путь и флаг --no-catalog (каталог обновляем в Laravel)
        $command = sprintf('%s "%s" --source "%s" --no-catalog', $pythonPath, $scriptPath, $relativeSourcePath);

        $output = [];
        $returnVar = 0;
        exec($command . ' 2>&1', $output, $returnVar);

        if ($returnVar !== 0) {
            throw new \Exception('Ошибка генерации класса: ' . implode("\n", $output));
        }

        Log::info('Cabinet generator output:', $output);
    }

    /**
     * Обновление catalog.json
     */
    private function updateCatalog(Cabinet $cabinet): void
    {
        $catalogPath = public_path('assets/models/cabinets/catalog.json');
        
        $catalog = File::exists($catalogPath)
            ? json_decode(File::get($catalogPath), true)
            : ['cabinets' => []];

        // Удаляем старую запись если есть
        $catalog['cabinets'] = array_filter($catalog['cabinets'], function($item) use ($cabinet) {
            return $item['id'] !== $cabinet->class_name;
        });

        // Добавляем новую
        $catalog['cabinets'][] = [
            'id' => $cabinet->class_name,
            'name' => $cabinet->display_name,
            'schemaVersion' => 2,
            'category' => $cabinet->category,
            'dimensions' => $cabinet->dimensions,
            'specs' => $cabinet->specs,
            'thermal' => $cabinet->thermal,
            'climate' => $cabinet->climate,
            'mountingCapabilities' => $cabinet->mounting_capabilities,
            'mountingZones' => $cabinet->mounting_zones,
            'modulePath' => $cabinet->module_path,
            'className' => $cabinet->class_name,
            'thumbnail' => $cabinet->thumbnail_path ? Storage::url($cabinet->thumbnail_path) : null,
            'description' => $cabinet->description
        ];

        File::put($catalogPath, json_encode($catalog, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    /**
     * Удаление из catalog.json
     */
    private function removeFromCatalog(Cabinet $cabinet): void
    {
        $catalogPath = public_path('assets/models/cabinets/catalog.json');
        
        if (!File::exists($catalogPath)) {
            return;
        }

        $catalog = json_decode(File::get($catalogPath), true);
        $catalog['cabinets'] = array_filter($catalog['cabinets'], function($item) use ($cabinet) {
            return $item['id'] !== $cabinet->class_name;
        });

        File::put($catalogPath, json_encode($catalog, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}
