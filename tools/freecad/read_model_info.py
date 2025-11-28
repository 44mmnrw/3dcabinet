# -*- coding: utf-8 -*-
"""
Script to read and analyze FreeCAD model information

This script analyzes the current model in FreeCAD and outputs
detailed information about objects, their shapes, dimensions, etc.

Usage:
    exec(open(r'C:\laragon\www\3dcabinet\tools\freecad\read_model_info.py', encoding='utf-8').read())
"""

import FreeCAD as App
import FreeCADGui as Gui
import Part
import json


def analyze_object(obj, indent=0):
    """Analyze a single object and return its information"""
    info = {}
    prefix = "  " * indent
    
    info['name'] = obj.Name
    info['label'] = obj.Label
    info['type'] = obj.TypeId
    
    print(f"{prefix}Object: {obj.Label} ({obj.Name})")
    print(f"{prefix}  Type: {obj.TypeId}")
    
    # Check if object has Shape
    if hasattr(obj, 'Shape'):
        shape = obj.Shape
        bbox = shape.BoundBox
        
        info['has_shape'] = True
        info['bounding_box'] = {
            'x_min': bbox.XMin,
            'x_max': bbox.XMax,
            'x_length': bbox.XLength,
            'y_min': bbox.YMin,
            'y_max': bbox.YMax,
            'y_length': bbox.YLength,
            'z_min': bbox.ZMin,
            'z_max': bbox.ZMax,
            'z_length': bbox.ZLength,
            'center': {
                'x': bbox.Center.x,
                'y': bbox.Center.y,
                'z': bbox.Center.z
            }
        }
        
        info['volume'] = shape.Volume if hasattr(shape, 'Volume') else 0
        info['area'] = shape.Area if hasattr(shape, 'Area') else 0
        
        print(f"{prefix}  Bounding Box:")
        print(f"{prefix}    X: {bbox.XMin:.2f} .. {bbox.XMax:.2f} (length: {bbox.XLength:.2f} mm)")
        print(f"{prefix}    Y: {bbox.YMin:.2f} .. {bbox.YMax:.2f} (length: {bbox.YLength:.2f} mm)")
        print(f"{prefix}    Z: {bbox.ZMin:.2f} .. {bbox.ZMax:.2f} (length: {bbox.ZLength:.2f} mm)")
        print(f"{prefix}    Center: ({bbox.Center.x:.2f}, {bbox.Center.y:.2f}, {bbox.Center.z:.2f})")
        print(f"{prefix}    Volume: {info['volume']:.2f} mm^3")
        print(f"{prefix}    Area: {info['area']:.2f} mm^2")
        
        # Shape type
        info['shape_type'] = shape.ShapeType
        print(f"{prefix}    Shape Type: {shape.ShapeType}")
        
        # Count elements
        info['elements'] = {
            'solids': len(shape.Solids) if hasattr(shape, 'Solids') else 0,
            'faces': len(shape.Faces) if hasattr(shape, 'Faces') else 0,
            'edges': len(shape.Edges) if hasattr(shape, 'Edges') else 0,
            'vertices': len(shape.Vertexes) if hasattr(shape, 'Vertexes') else 0
        }
        print(f"{prefix}    Elements: {info['elements']['solids']} solids, {info['elements']['faces']} faces, {info['elements']['edges']} edges, {info['elements']['vertices']} vertices")
        
        # Placement
        if hasattr(obj, 'Placement'):
            placement = obj.Placement
            info['placement'] = {
                'base': {
                    'x': placement.Base.x,
                    'y': placement.Base.y,
                    'z': placement.Base.z
                },
                'rotation': {
                    'x': placement.Rotation.Axis.x,
                    'y': placement.Rotation.Axis.y,
                    'z': placement.Rotation.Axis.z,
                    'angle': placement.Rotation.Angle
                }
            }
            print(f"{prefix}    Placement: Base=({placement.Base.x:.2f}, {placement.Base.y:.2f}, {placement.Base.z:.2f})")
    else:
        info['has_shape'] = False
        print(f"{prefix}  No Shape attribute")
    
    # Check for children/group
    if hasattr(obj, 'Group') and obj.Group:
        info['children'] = []
        print(f"{prefix}  Children ({len(obj.Group)}):")
        for child in obj.Group:
            child_info = analyze_object(child, indent + 1)
            info['children'].append(child_info)
    
    return info


def analyze_document():
    """Analyze the active FreeCAD document"""
    if not App.ActiveDocument:
        print("[ERROR] No active FreeCAD document!")
        return None
    
    doc = App.ActiveDocument
    print("\n" + "="*70)
    print("FREECAD MODEL ANALYSIS")
    print("="*70)
    print(f"Document: {doc.Name}")
    print(f"Objects count: {len(doc.Objects)}")
    print("="*70 + "\n")
    
    # Get selected objects
    selection = Gui.Selection.getSelection()
    if selection:
        print(f"Selected objects: {len(selection)}")
        objects_to_analyze = selection
    else:
        print("No selection, analyzing all objects with Shape")
        objects_to_analyze = [obj for obj in doc.Objects if hasattr(obj, 'Shape')]
    
    print(f"Objects to analyze: {len(objects_to_analyze)}\n")
    
    # Analyze each object
    all_info = {
        'document': doc.Name,
        'objects_count': len(doc.Objects),
        'analyzed_count': len(objects_to_analyze),
        'objects': []
    }
    
    for obj in objects_to_analyze:
        obj_info = analyze_object(obj)
        all_info['objects'].append(obj_info)
        print()
    
    # Summary
    print("="*70)
    print("SUMMARY")
    print("="*70)
    print(f"Total objects analyzed: {len(all_info['objects'])}")
    
    if all_info['objects']:
        # Calculate overall bounding box
        all_x_min = min(obj['bounding_box']['x_min'] for obj in all_info['objects'] if obj.get('has_shape'))
        all_x_max = max(obj['bounding_box']['x_max'] for obj in all_info['objects'] if obj.get('has_shape'))
        all_y_min = min(obj['bounding_box']['y_min'] for obj in all_info['objects'] if obj.get('has_shape'))
        all_y_max = max(obj['bounding_box']['y_max'] for obj in all_info['objects'] if obj.get('has_shape'))
        all_z_min = min(obj['bounding_box']['z_min'] for obj in all_info['objects'] if obj.get('has_shape'))
        all_z_max = max(obj['bounding_box']['z_max'] for obj in all_info['objects'] if obj.get('has_shape'))
        
        print(f"\nOverall Bounding Box:")
        print(f"  X: {all_x_min:.2f} .. {all_x_max:.2f} (length: {all_x_max - all_x_min:.2f} mm)")
        print(f"  Y: {all_y_min:.2f} .. {all_y_max:.2f} (length: {all_y_max - all_y_min:.2f} mm)")
        print(f"  Z: {all_z_min:.2f} .. {all_z_max:.2f} (length: {all_z_max - all_z_min:.2f} mm)")
        print(f"  Center: ({(all_x_min + all_x_max)/2:.2f}, {(all_y_min + all_y_max)/2:.2f}, {(all_z_min + all_z_max)/2:.2f})")
    
    print("="*70 + "\n")
    
    # Save to JSON (for easy sharing)
    try:
        # Convert to JSON-serializable format
        json_data = json.dumps(all_info, indent=2, default=str)
        print("JSON representation:")
        print(json_data)
        print("\n" + "="*70)
        print("You can copy the JSON above and send it for analysis")
        print("="*70 + "\n")
    except Exception as e:
        print(f"[WARNING] Could not create JSON: {e}")
    
    return all_info


# Main execution
if __name__ == "__main__":
    analyze_document()

