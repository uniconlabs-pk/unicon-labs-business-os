'use client'
// Force deployment update fix

import { useState, useEffect, use, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { getBusinessProfile } from '@/lib/businessProfiles'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function TenantProductInventoryDashboard({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()

  const [business, setBusiness] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [importingCsv, setImportingCsv] = useState(false)
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'CATEGORIES'>('PRODUCTS')

  // Data States
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  // Filtering States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMotherCategoryFilter, setSelectedMotherCategoryFilter] = useState('ALL')
  const [selectedSubCategoryFilter, setSelectedSubCategoryFilter] = useState<string | null>(null)

  // Drag & Drop
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null)
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null)

  // Modal States
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)

  // Multi-linking toggle & tree expansion state
  const [prodMultiCategoryEnabled, setProdMultiCategoryEnabled] = useState(false)
  const [expandedMultiCats, setExpandedMultiCats] = useState<string[]>([])

  // Form Fields: Category (Max 3 Levels Support)
  const [catName, setCatName] = useState('')
  const [catParentId, setCatParentId] = useState<string | ''>('')

  // Form Fields: Product & Advanced Features
  const [prodName, setProdName] = useState('')
  const [prodCategory, setProdCategory] = useState('')
  const [prodLinkedCategories, setProdLinkedCategories] = useState<string[]>([])
  const [prodPrice, setProdPrice] = useState('')
  const [prodDescription, setProdDescription] = useState('')
  
  // Promotional Badges Enabler
  const [prodBadgeEnabled, setProdBadgeEnabled] = useState(false)
  const [prodBadgeText, setProdBadgeText] = useState('HOT SELLER')

  const [prodInStock, setProdInStock] = useState(true)
  const [prodImage, setProdImage] = useState('')

  // Deals / Combos / Bundles Creator (Universal)
  const [prodIsDeal, setProdIsDeal] = useState(false)
  const [prodDealItems, setProdDealItems] = useState<{ itemId: string; qty: number }[]>([{ itemId: '', qty: 1 }])

  // Feature 1: Universal Product Variant Enabler
  const [prodHasVariants, setProdHasVariants] = useState(false)
  const [prodVariants, setProdVariants] = useState<{ name: string; price: number }[]>([{ name: '', price: 0 }])

  // Feature 2: Restaurant-Exclusive Product Modifier Enabler
  const [prodHasModifiers, setProdHasModifiers] = useState(false)

  // Adaptive Industry Attributes (Pharmacy / Medical Specific Fields)
  const [prodBarcode, setProdBarcode] = useState('')
  const [prodBrandName, setProdBrandName] = useState('')
  const [prodGenericName, setProdGenericName] = useState('')
  const [prodDosageStrength, setProdDosageStrength] = useState('')
  const [prodBatchNumber, setProdBatchNumber] = useState('')
  const [prodExpiryDate, setProdExpiryDate] = useState('')
  const [prodIsRxRequired, setProdIsRxRequired] = useState(false)
  const [prodStorageCondition, setProdStorageCondition] = useState('')
  const [prodUnitMeasure, setProdUnitMeasure] = useState('PIECE')

  useEffect(() => {
    const rawSession = localStorage.getItem(`tenant_session_${slug}`)
    if (!rawSession) {
      router.push(`/${slug}/login`)
      return
    }

    async function loadTenantData() {
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single()

      if (biz) {
        setBusiness(biz)
        setProfile(getBusinessProfile(biz.business_type))

        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .eq('business_id', biz.id)
          .order('sort_order', { ascending: true })
        if (catData) setCategories(catData)

        const { data: prodData } = await supabase
          .from('products')
          .select('*')
          .eq('business_id', biz.id)
          .order('sort_order', { ascending: true })
        if (prodData) setProducts(prodData)
      }
      setLoading(false)
    }

    loadTenantData()
  }, [slug, router])

  // ALL USEMEMO HOOKS DECLARED UNCONDITIONALLY AT TOP LEVEL
  const categoryTree = useMemo(() => {
    const flatList = categories || []
    const buildTree = (list: any[], parentId: string | null = null, depth = 1): any[] => {
      if (depth > 3) return []
      return list
        .filter(c => (c.parent_id || null) === parentId)
        .map(c => ({
          ...c,
          depth,
          children: buildTree(list, c.id, depth + 1)
        }))
    }
    return buildTree(flatList)
  }, [categories])

  const flattenedCategories = useMemo(() => {
    const flatten = (tree: any[]): any[] => {
      return tree.flatMap(node => [
        { id: node.id, name: node.name, label: `${'— '.repeat(node.depth - 1)}${node.name}`, depth: node.depth, parent_id: node.parent_id },
        ...flatten(node.children)
      ])
    }
    return flatten(categoryTree)
  }, [categoryTree])

  const motherCategories = useMemo(() => {
    return (categories || []).filter(c => !c.parent_id || c.parent_id === '')
  }, [categories])

  const activeMotherCategoryObj = useMemo(() => {
    if (selectedMotherCategoryFilter === 'ALL') return null
    return (categories || []).find(c => c.name === selectedMotherCategoryFilter) || null
  }, [selectedMotherCategoryFilter, categories])

  const activeSubcategories = useMemo(() => {
    if (!activeMotherCategoryObj) return []
    return (categories || []).filter(c => c.parent_id === activeMotherCategoryObj.id)
  }, [activeMotherCategoryObj, categories])

  const getDescendantNames = useMemo(() => {
    return (catNameVal: string): string[] => {
      const list = categories || []
      const catObj = list.find(c => c.name === catNameVal)
      if (!catObj) return [catNameVal]
      const getChildrenNames = (parentId: string): string[] => {
        const kids = list.filter(c => c.parent_id === parentId)
        return kids.flatMap(k => [k.name, ...getChildrenNames(k.id)])
      }
      return [catObj.name, ...getChildrenNames(catObj.id)]
    }
  }, [categories])

  // Exclude primary cat + ancestor/mother path + descendant branch from multi-linking
  const excludedForMultiLinking = useMemo(() => {
    if (!prodCategory) return []
    const list = categories || []
    const primaryObj = list.find(c => c.name === prodCategory)
    if (!primaryObj) return [prodCategory]

    const getAncestorNames = (catObj: any): string[] => {
      if (!catObj.parent_id) return [catObj.name]
      const parentObj = list.find(c => c.id === catObj.parent_id)
      return parentObj ? [catObj.name, ...getAncestorNames(parentObj)] : [catObj.name]
    }

    const getDescendantNamesList = (parentId: string): string[] => {
      const kids = list.filter(c => c.parent_id === parentId)
      return kids.flatMap(k => [k.name, ...getDescendantNamesList(k.id)])
    }

    const ancestors = getAncestorNames(primaryObj)
    const descendants = getDescendantNamesList(primaryObj.id)

    return Array.from(new Set([...ancestors, ...descendants]))
  }, [prodCategory, categories])

  // STRICT PERMANENT CATEGORY SEQUENCE LOCK FOR ALL / BRANCH VIEWS
  const filteredProducts = useMemo(() => {
    const list = products || []
    const searchedProducts = list.filter(p => {
      return (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
             (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
             (p.brand_name && p.brand_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
             (p.generic_name && p.generic_name.toLowerCase().includes(searchQuery.toLowerCase()))
    })

    if (selectedMotherCategoryFilter === 'ALL') {
      const orderedList: any[] = []
      const processedIds = new Set()

      flattenedCategories.forEach(cat => {
        const catProducts = searchedProducts
          .filter(p => {
            const primary = p.category || 'GENERAL'
            const linked = p.linked_categories || []
            return [primary, ...linked].includes(cat.name) && !processedIds.has(p.id)
          })
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

        catProducts.forEach(cp => {
          processedIds.add(cp.id)
          orderedList.push(cp)
        })
      })

      searchedProducts
        .filter(p => !processedIds.has(p.id))
        .sort((a, b) => ((a.sort_order ?? 0) - (b.sort_order ?? 0)) || (a.name || '').localeCompare(b.name || ''))
        .forEach(cp => {
          processedIds.add(cp.id)
          orderedList.push(cp)
        })

      return orderedList
    }

    if (selectedSubCategoryFilter) {
      return searchedProducts
        .filter(p => {
          const primaryCat = p.category || 'GENERAL'
          const linkedCats = p.linked_categories || []
          return [primaryCat, ...linkedCats].includes(selectedSubCategoryFilter)
        })
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    } else {
      const targetCategoryNames = getDescendantNames(selectedMotherCategoryFilter)
      return searchedProducts
        .filter(p => {
          const primaryCat = p.category || 'GENERAL'
          const linkedCats = p.linked_categories || []
          const combined = [primaryCat, ...linkedCats]
          return combined.some(c => targetCategoryNames.includes(c))
        })
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    }
  }, [products, searchQuery, selectedMotherCategoryFilter, selectedSubCategoryFilter, flattenedCategories, getDescendantNames])

  // SAFE LOADING GUARD PLACED AFTER ALL HOOKS
  if (loading || !profile) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-700">Loading Tenant Ecosystem...</div>
  }

  const currencySymbol = business?.currency_symbol || 'Rs.'
  const isRestaurant = profile.typeKey === 'restaurant'
  const isPharmacy = business?.business_type?.toLowerCase() === 'pharmacy' || profile.typeKey === 'pharmacy'

  // CSV Import/Export
  const handleDownloadCsvTemplate = () => {
    const csvHeader = "name,category_name,price,description,in_stock,badge_enabled,badge_text\n"
    const sampleRow1 = '"Standard Item","GENERAL",450.00,"Description of item",true,true,"HOT SELLER"\n'
    const blob = new Blob([csvHeader + sampleRow1], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'product_import_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCsvImportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !business) return

    setImportingCsv(true)
    const reader = new FileReader()

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '')

        if (lines.length < 2) {
          alert('CSV file is empty.')
          setImportingCsv(false)
          return
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
        const nameIdx = headers.indexOf('name')
        const catIdx = headers.indexOf('category_name')
        const priceIdx = headers.indexOf('price')
        const descIdx = headers.indexOf('description')
        const stockIdx = headers.indexOf('in_stock')

        if (nameIdx === -1 || priceIdx === -1 || catIdx === -1) {
          alert('CSV format error: Missing required columns.')
          setImportingCsv(false)
          return
        }

        let importedCount = 0
        const currentCategories = [...categories]

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',')
          const cleanRow = row.map(val => val.trim().replace(/^"|"$/g, ''))

          const name = cleanRow[nameIdx]
          const categoryName = (cleanRow[catIdx] || 'GENERAL').toUpperCase()
          const price = parseFloat(cleanRow[priceIdx]) || 0
          const description = descIdx !== -1 ? cleanRow[descIdx] : ''
          const inStock = stockIdx !== -1 ? cleanRow[stockIdx].toLowerCase() !== 'false' : true

          if (!name || isNaN(price)) continue

          let matchedCat = currentCategories.find(c => c.name === categoryName)
          if (!matchedCat) {
            const newSort = currentCategories.length
            const { data: newCatData } = await supabase
              .from('categories')
              .insert([{ business_id: business.id, name: categoryName, sort_order: newSort, parent_id: null, level: 1 }])
              .select()

            if (newCatData && newCatData[0]) {
              currentCategories.push(newCatData[0])
            }
          }

          const productPayload = {
            business_id: business.id,
            name,
            category: categoryName,
            price,
            description: description || null,
            in_stock: inStock,
            sort_order: products.length + importedCount,
            has_modifiers: false,
            variants: []
          }

          const { data: insertedProd, error: insertErr } = await supabase
            .from('products')
            .insert([productPayload])
            .select()

          if (!insertErr && insertedProd) {
            setProducts(prev => [...prev, insertedProd[0]])
            importedCount++
          }
        }

        setCategories(currentCategories)
        alert(`Successfully imported ${importedCount} items!`)
      } catch (err: any) {
        alert(`Failed to parse CSV: ${err.message}`)
      } finally {
        setImportingCsv(false)
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  // Drag & Drop Reordering (Permanent persistence)
  const handleProductDragStart = (e: React.DragEvent, id: string) => {
    setDraggedProductId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleProductDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleProductDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedProductId || draggedProductId === targetId) return

    const draggedIndex = products.findIndex(p => p.id === draggedProductId)
    const targetIndex = products.findIndex(p => p.id === targetId)
    if (draggedIndex === -1 || targetIndex === -1) return

    const updatedProducts = [...products]
    const [movedItem] = updatedProducts.splice(draggedIndex, 1)
    updatedProducts.splice(targetIndex, 0, movedItem)

    const reindexed = updatedProducts.map((p, idx) => ({ ...p, sort_order: idx }))
    setProducts(reindexed)
    setDraggedProductId(null)

    await Promise.all(
      reindexed.map((p) =>
        supabase.from('products').update({ sort_order: p.sort_order }).eq('id', p.id).eq('business_id', business.id)
      )
    )
  }

  const handleCategoryDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCategoryId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleCategoryDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleCategoryDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedCategoryId || draggedCategoryId === targetId) return

    const draggedIndex = categories.findIndex(c => c.id === draggedCategoryId)
    const targetIndex = categories.findIndex(c => c.id === targetId)
    if (draggedIndex === -1 || targetIndex === -1) return

    const updatedCategories = [...categories]
    const [movedCat] = updatedCategories.splice(draggedIndex, 1)
    updatedCategories.splice(targetIndex, 0, movedCat)

    const reindexed = updatedCategories.map((c, idx) => ({ ...c, sort_order: idx }))
    setCategories(reindexed)
    setDraggedCategoryId(null)

    await Promise.all(
      reindexed.map((c) =>
        supabase.from('categories').update({ sort_order: c.sort_order }).eq('id', c.id).eq('business_id', business.id)
      )
    )
  }

  const handleDesktopImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
    const filePath = `${slug}/${fileName}`

    const { error: uploadError } = await supabase.storage.from('products').upload(filePath, file)

    if (uploadError) {
      alert(`Image upload failed: ${uploadError.message}`)
      setUploadingImage(false)
      return
    }

    const { data } = supabase.storage.from('products').getPublicUrl(filePath)
    if (data?.publicUrl) {
      setProdImage(data.publicUrl)
    }
    setUploadingImage(false)
  }

  function getSubtreeCategoryIds(parentId: string, cats: any[]): string[] {
    const children = cats.filter(c => (c.parent_id || null) === parentId)
    return [parentId, ...children.flatMap(child => getSubtreeCategoryIds(child.id, cats))]
  }

  // Safe-Delete Subtree & Product Dependency Guard for Categories/Subcategories
  const handleSafeDeleteCategoryTree = async (categoryId: string) => {
    const targetCategoryIds = getSubtreeCategoryIds(categoryId, categories)
    const targetCatNames = categories.filter(c => targetCategoryIds.includes(c.id)).map(c => c.name)

    const { count, error: countErr } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .or(targetCatNames.map(name => `category.eq.${name}`).join(','))

    if (countErr) {
      alert(`Validation error checking dependencies: ${countErr.message}`)
      return
    }

    if (count && count > 0) {
      alert(`Cannot delete category branch: ${count} active item(s) are assigned to this category or its subcategories. Please reassign or delete containing items first.`)
      return
    }

    if (!confirm('Delete this category / subcategory branch?')) return

    const { error: delErr } = await supabase
      .from('categories')
      .delete()
      .in('id', targetCategoryIds)
      .eq('business_id', business.id)

    if (!delErr) {
      setCategories(categories.filter(c => !targetCategoryIds.includes(c.id)))
    } else {
      alert(`Delete error: ${delErr.message}`)
    }
  }

  // Category Actions (Max 3 levels check)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName) return

    let parentLevel = 1
    if (catParentId) {
      const parentCat = categories.find(c => c.id === catParentId)
      if (parentCat) {
        parentLevel = (parentCat.level || 1) + 1
      }
    }

    if (parentLevel > 3) {
      alert('Maximum nesting depth (3 levels) reached. Cannot create subcategory deeper than level 3.')
      return
    }

    if (editingCategoryId) {
      const { error } = await supabase
        .from('categories')
        .update({ 
          name: catName.toUpperCase(), 
          parent_id: catParentId || null,
          level: parentLevel
        })
        .eq('id', editingCategoryId)
        .eq('business_id', business.id)

      if (!error) {
        setCategories(categories.map(c => editingCategoryId === c.id ? { ...c, name: catName.toUpperCase(), parent_id: catParentId || null, level: parentLevel } : c))
        closeCategoryModal()
      }
    } else {
      const newSortOrder = categories.length
      const { data, error } = await supabase.from('categories').insert([
        { 
          business_id: business.id, 
          name: catName.toUpperCase(), 
          parent_id: catParentId || null,
          level: parentLevel,
          sort_order: newSortOrder 
        }
      ]).select()

      if (!error && data) {
        setCategories([...categories, data[0]])
        closeCategoryModal()
      }
    }
  }

  const openEditCategory = (cat: any) => {
    setEditingCategoryId(cat.id)
    setCatName(cat.name)
    setCatParentId(cat.parent_id || '')
    setShowCategoryModal(true)
  }

  const openCreateSubcategory = (parentId: string) => {
    setEditingCategoryId(null)
    setCatName('')
    setCatParentId(parentId)
    setShowCategoryModal(true)
  }

  const closeCategoryModal = () => {
    setEditingCategoryId(null)
    setCatName('')
    setCatParentId('')
    setShowCategoryModal(false)
  }

  // Product Actions
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prodName || !prodPrice || !prodCategory) {
      alert('Please provide name, price, and primary category.')
      return
    }

    const productPayload = {
      business_id: business.id,
      name: prodName,
      category: prodCategory,
      linked_categories: prodMultiCategoryEnabled ? prodLinkedCategories.filter(c => c !== prodCategory) : [],
      price: parseFloat(prodPrice),
      description: prodDescription ? prodDescription.trim() : null,
      badge_enabled: Boolean(prodBadgeEnabled),
      badge_text: prodBadgeEnabled ? prodBadgeText : null,
      in_stock: Boolean(prodInStock),
      image_url: prodImage ? prodImage.trim() : null,
      is_deal: Boolean(prodIsDeal),
      deal_items: prodIsDeal ? prodDealItems : null,
      has_modifiers: isRestaurant ? Boolean(prodHasModifiers) : false,
      variants: prodHasVariants ? prodVariants.filter(v => v.name.trim() !== '') : [],
      // Pharmacy specific attributes
      barcode: isPharmacy ? prodBarcode.trim() : null,
      brand_name: isPharmacy ? prodBrandName.trim() : null,
      generic_name: isPharmacy ? prodGenericName.trim() : null,
      dosage_strength: isPharmacy ? prodDosageStrength.trim() : null,
      batch_number: isPharmacy ? prodBatchNumber.trim() : null,
      expiry_date: isPharmacy && prodExpiryDate ? prodExpiryDate : null,
      is_prescription_required: isPharmacy ? Boolean(prodIsRxRequired) : false,
      storage_condition: isPharmacy ? prodStorageCondition.trim() : null,
      unit_measure: prodUnitMeasure
    }

    if (editingProductId) {
      const { error } = await supabase.from('products').update(productPayload).eq('id', editingProductId).eq('business_id', business.id)
      if (!error) {
        setProducts(products.map(p => p.id === editingProductId ? { ...p, ...productPayload } : p))
        closeProductModal()
      } else {
        alert(`Error updating item: ${error.message}`)
      }
    } else {
      const newSortOrder = products.length
      const { data, error } = await supabase.from('products').insert([{ ...productPayload, sort_order: newSortOrder }]).select()
      if (!error && data) {
        setProducts([...products, data[0]])
        closeProductModal()
      } else {
        alert(`Error saving item: ${error?.message || 'Unknown error'}`)
      }
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    const { error } = await supabase.from('products').delete().eq('id', id).eq('business_id', business.id)
    if (!error) {
      setProducts(products.filter(p => p.id !== id))
    }
  }

  const toggleStockStatus = async (prodId: string, currentStatus: boolean) => {
    const updatedStatus = !currentStatus
    const { error } = await supabase.from('products').update({ in_stock: updatedStatus }).eq('id', prodId).eq('business_id', business.id)
    if (!error) {
      setProducts(products.map(p => p.id === prodId ? { ...p, in_stock: updatedStatus } : p))
    }
  }

  const openEditProduct = (prod: any) => {
    setEditingProductId(prod.id)
    setProdName(prod.name)
    setProdCategory(prod.category || '')
    setProdLinkedCategories(prod.linked_categories || [])
    setProdMultiCategoryEnabled(Boolean(prod.linked_categories && prod.linked_categories.length > 0))
    setProdPrice(prod.price)
    setProdDescription(prod.description || '')
    setProdBadgeEnabled(prod.badge_enabled || false)
    setProdBadgeText(prod.badge_text || 'HOT SELLER')
    setProdInStock(prod.in_stock ?? true)
    setProdImage(prod.image_url || '')
    setProdIsDeal(prod.is_deal || false)
    setProdDealItems(prod.deal_items || [{ itemId: '', qty: 1 }])
    setProdHasVariants(prod.variants && prod.variants.length > 0)
    setProdVariants(prod.variants && prod.variants.length > 0 ? prod.variants : [{ name: '', price: 0 }])
    setProdHasModifiers(prod.has_modifiers || false)
    setProdBarcode(prod.barcode || '')
    setProdBrandName(prod.brand_name || '')
    setProdGenericName(prod.generic_name || '')
    setProdDosageStrength(prod.dosage_strength || '')
    setProdBatchNumber(prod.batch_number || '')
    setProdExpiryDate(prod.expiry_date || '')
    setProdIsRxRequired(prod.is_prescription_required || false)
    setProdStorageCondition(prod.storage_condition || '')
    setProdUnitMeasure(prod.unit_measure || 'PIECE')
    setShowProductModal(true)
  }

  const closeProductModal = () => {
    setEditingProductId(null)
    setProdName('')
    setProdCategory('')
    setProdLinkedCategories([])
    setProdMultiCategoryEnabled(false)
    setExpandedMultiCats([])
    setProdPrice('')
    setProdDescription('')
    setProdBadgeEnabled(false)
    setProdBadgeText('HOT SELLER')
    setProdInStock(true)
    setProdImage('')
    setProdIsDeal(false)
    setProdDealItems([{ itemId: '', qty: 1 }])
    setProdHasVariants(false)
    setProdVariants([{ name: '', price: 0 }])
    setProdHasModifiers(false)
    setProdBarcode('')
    setProdBrandName('')
    setProdGenericName('')
    setProdDosageStrength('')
    setProdBatchNumber('')
    setProdExpiryDate('')
    setProdIsRxRequired(false)
    setProdStorageCondition('')
    setProdUnitMeasure('PIECE')
    setShowProductModal(false)
  }

  // Recursive Level 2 & Level 3 renderer for unified mother category cards
  const renderNestedCategories = (children: any[]) => {
    if (!children || children.length === 0) return null
    return (
      <div className="space-y-1.5 pt-1.5">
        {children.map((child: any) => (
          <div key={child.id} className="space-y-1">
            <div 
              className={`flex items-center justify-between p-2 rounded-xl border text-xs transition ${
                child.depth === 2 ? 'bg-gray-50/90 border-gray-200' : 'bg-white border-gray-100'
              }`}
              style={{ marginLeft: `${(child.depth - 2) * 16}px` }}
            >
              <div className="flex items-center space-x-1.5 truncate">
                <span className="text-gray-400 font-bold">{child.depth === 2 ? '↳' : '↳↳'}</span>
                <span className={`truncate ${child.depth === 2 ? 'font-bold text-gray-800' : 'font-medium text-gray-700'}`}>
                  {child.name}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${
                  child.depth === 2 ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-purple-50 text-purple-700 border-purple-100'
                }`}>
                  L{child.depth}
                </span>
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <button 
                  onClick={() => openEditCategory(child)} 
                  className="px-2 py-0.5 bg-white hover:bg-gray-100 text-gray-700 rounded-lg text-[10px] font-bold border border-gray-200 transition"
                >
                  ✏️ Edit
                </button>
                <button 
                  onClick={() => handleSafeDeleteCategoryTree(child.id)} 
                  className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[10px] font-bold border border-red-200 transition"
                >
                  🗑️ Del
                </button>
              </div>
            </div>
            {child.children && child.children.length > 0 && renderNestedCategories(child.children)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col font-sans">
      
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-8 py-5 flex justify-between items-center shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-inner">
            📦
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wide flex items-center space-x-2">
              <span>{profile.terminology.productsLabel}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${profile.badgeColor}`}>
                {profile.displayName}
              </span>
            </h1>
            <p className="text-[10px] text-gray-400 font-medium">Tenant Portal: {business?.name} ({slug})</p>
          </div>
        </div>
        <a href={`/${slug}`} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition">
          ← Back to Dashboard
        </a>
      </header>

      {/* Sub-Tabs & Actions */}
      <div className="bg-white border-b border-gray-200 px-8 py-3 flex flex-wrap justify-between items-center gap-3">
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveTab('PRODUCTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'PRODUCTS' ? 'bg-slate-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            📦 {profile.terminology.productsLabel} ({products.length})
          </button>
          <button 
            onClick={() => setActiveTab('CATEGORIES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'CATEGORIES' ? 'bg-slate-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            🏷️ Hierarchical Categories ({categories.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleDownloadCsvTemplate}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition shadow-2xs flex items-center space-x-1"
          >
            <span>📥 CSV Template</span>
          </button>

          <label className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer flex items-center space-x-1">
            <span>{importingCsv ? '⏳ Importing...' : '📤 Import CSV'}</span>
            <input type="file" accept=".csv" onChange={handleCsvImportUpload} disabled={importingCsv} className="hidden" />
          </label>

          <button 
            onClick={() => { closeCategoryModal(); setCatParentId(''); setShowCategoryModal(true); }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition"
          >
            + Add Mother Category
          </button>
          <button 
            onClick={() => { closeProductModal(); setShowProductModal(true); }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            + Add New Item
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        
        {activeTab === 'PRODUCTS' && (
          <div className="space-y-6">
            
            <div className="sticky top-0 z-40 bg-gray-100/90 backdrop-blur-md pt-2 pb-4 space-y-3">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-md space-y-3">
                <input 
                  type="text" 
                  placeholder={`🔍 Search ${profile.terminology.productsLabel.toLowerCase()} (Name, Brand, Generic)...`} 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-emerald-500 font-medium"
                />

                {/* Level 1: Mother Categories display (Strict Sequence) */}
                <div className="flex space-x-2 overflow-x-auto pb-1 pt-1">
                  <button
                    onClick={() => { setSelectedMotherCategoryFilter('ALL'); setSelectedSubCategoryFilter(null); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap uppercase ${
                      selectedMotherCategoryFilter === 'ALL' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    ALL ({products.length})
                  </button>
                  {motherCategories.map(mother => {
                    const count = products.filter(p => {
                      const primary = p.category || 'GENERAL'
                      const linked = p.linked_categories || []
                      return [primary, ...linked].some(c => getDescendantNames(mother.name).includes(c))
                    }).length

                    return (
                      <button
                        key={mother.id}
                        onClick={() => { setSelectedMotherCategoryFilter(mother.name); setSelectedSubCategoryFilter(null); }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap uppercase ${
                          selectedMotherCategoryFilter === mother.name ? 'bg-slate-900 text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        📁 {mother.name} ({count})
                      </button>
                    )
                  })}
                </div>

                {/* Subcategory dropdown / sub-filter bar if mother category has subcategories */}
                {selectedMotherCategoryFilter !== 'ALL' && activeSubcategories.length > 0 && (
                  <div className="flex items-center space-x-2 pt-2 border-t border-gray-100 overflow-x-auto">
                    <span className="text-[10px] font-bold uppercase text-gray-400 whitespace-nowrap">Subcategory Filter:</span>
                    <button
                      onClick={() => setSelectedSubCategoryFilter(null)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                        selectedSubCategoryFilter === null ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      All in {selectedMotherCategoryFilter}
                    </button>
                    {activeSubcategories.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setSelectedSubCategoryFilter(sub.name)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                          selectedSubCategoryFilter === sub.name ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        ↳ {sub.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.length > 0 ? filteredProducts.map(p => {
                const primaryCat = p.category || 'GENERAL'
                const linkedCats = p.linked_categories || []

                return (
                  <div 
                    key={p.id}
                    draggable
                    onDragStart={(e) => handleProductDragStart(e, p.id)}
                    onDragOver={handleProductDragOver}
                    onDrop={(e) => handleProductDrop(e, p.id)}
                    className={`bg-white border rounded-2xl p-4 flex flex-col justify-between shadow-sm transition cursor-grab active:cursor-grabbing hover:shadow-md ${
                      p.in_stock ? 'border-gray-200' : 'border-red-300 bg-red-50/25'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex space-x-1.5 items-center flex-wrap gap-y-1">
                          <span className="text-[10px] font-extrabold uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {primaryCat}
                          </span>
                          {linkedCats.map((lc: string, lcIdx: number) => (
                            <span key={lcIdx} className="text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                              🔗 {lc}
                            </span>
                          ))}
                          {p.is_deal && (
                            <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                              🔥 Bundle
                            </span>
                          )}
                          {isPharmacy && p.is_prescription_required && (
                            <span className="text-[10px] font-black uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                              Rx Only
                            </span>
                          )}
                        </div>
                        {p.badge_enabled && (
                          <span className="bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-xs">
                            {p.badge_text}
                          </span>
                        )}
                      </div>

                      <div className="w-full h-28 bg-gray-50 rounded-xl mb-3 overflow-hidden flex items-center justify-center border border-gray-100 p-2">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-contain drop-shadow-sm"/>
                        ) : (
                          <span className="text-2xl">📦</span>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-sm text-gray-900">{p.name}</h3>
                        <span className="text-xs text-gray-400 font-mono">⠿</span>
                      </div>

                      {/* Pharmacy Specific Badge / Labels on Card */}
                      {isPharmacy && (
                        <div className="mt-1 space-y-0.5 text-[11px]">
                          {p.brand_name && <div className="font-semibold text-emerald-800">Brand: {p.brand_name}</div>}
                          {p.generic_name && <div className="text-gray-500 italic">Generic: {p.generic_name} {p.dosage_strength}</div>}
                          {p.batch_number && <div className="font-mono text-[10px] text-gray-400">Batch: {p.batch_number} {p.expiry_date ? `| Exp: ${p.expiry_date}` : ''}</div>}
                        </div>
                      )}

                      {p.description && (
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">{p.description}</p>
                      )}

                      {p.variants && p.variants.length > 0 && (
                        <div className="mt-2 bg-purple-50/60 p-2 rounded-xl border border-purple-200 space-y-0.5">
                          <span className="text-[9px] font-bold uppercase text-purple-900 block">Variants / Options:</span>
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {p.variants.map((v: any, idx: number) => (
                              <span key={idx} className="text-[10px] bg-white border border-purple-200 px-1.5 py-0.5 rounded text-purple-900 font-medium">
                                {v.name} (+{currencySymbol} {v.price})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {p.is_deal && p.deal_items && p.deal_items.length > 0 && (
                        <div className="mt-2.5 bg-amber-50/60 p-2 rounded-xl border border-amber-200 space-y-1">
                          <span className="text-[9px] font-extrabold uppercase text-amber-900 block">📦 Bundle Contents:</span>
                          <ul className="text-[10px] text-gray-700 space-y-0.5">
                            {p.deal_items.map((di: any, idx: number) => {
                              const matched = products.find(item => item.id === di.itemId)
                              return (
                                <li key={idx} className="flex justify-between items-center bg-white/70 px-2 py-0.5 rounded border border-amber-100">
                                  <span className="font-medium truncate pr-1">• {matched?.name || 'Item'}</span>
                                  <span className="font-mono font-bold text-amber-900">Qty: {di.qty}</span>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}

                      <p className="text-emerald-600 font-mono font-extrabold text-xs mt-2">{currencySymbol} {p.price}</p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-100 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className={`text-[10px] font-bold uppercase ${p.in_stock ? 'text-green-700' : 'text-red-600'}`}>
                          {p.in_stock ? '● In Stock' : '✕ Out of Stock'}
                        </span>
                        <button 
                          onClick={() => toggleStockStatus(p.id, p.in_stock)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition ${p.in_stock ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        >
                          {p.in_stock ? 'Make Out of Stock' : 'Restock'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1 pt-1">
                        <button onClick={() => openEditProduct(p)} className="py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold transition">
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[11px] font-bold transition">
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              }) : (
                <div className="col-span-full text-center py-20 text-gray-400 text-xs">
                  No items found matching your filter.
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'CATEGORIES' && (
          <div className="space-y-4">
            <p className="text-[11px] font-bold text-gray-500 italic">💡 Unified Mother Category Cards (max 3 nesting levels). Drag mother cards to reorder POS tabs.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryTree.map((mother: any) => (
                <div 
                  key={mother.id} 
                  draggable
                  onDragStart={(e) => handleCategoryDragStart(e, mother.id)}
                  onDragOver={handleCategoryDragOver}
                  onDrop={(e) => handleCategoryDrop(e, mother.id)}
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition cursor-grab active:cursor-grabbing"
                >
                  {/* Mother Header Row */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 font-mono text-xs">⠿</span>
                      <div>
                        <span className="font-extrabold text-sm text-gray-900 block">📁 {mother.name}</span>
                        <span className="text-[9px] text-gray-400 uppercase font-mono">Mother Category (Level 1)</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button 
                        onClick={() => openEditCategory(mother)} 
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition"
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleSafeDeleteCategoryTree(mother.id)} 
                        className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold transition"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>

                  {/* Action Trigger: Add Subcategory scoped to this mother family */}
                  <div>
                    <button
                      type="button"
                      onClick={() => openCreateSubcategory(mother.id)}
                      className="w-full py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1"
                    >
                      <span>+ Add Subcategory to {mother.name}</span>
                    </button>
                  </div>

                  {/* Nested Hierarchy Rows (Level 2 & Level 3 unified inside card) */}
                  {mother.children && mother.children.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Nested Subcategories:
                      </span>
                      {renderNestedCategories(mother.children)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* MODAL: HIERARCHICAL CATEGORY (Max 3 levels enforced) */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveCategory} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="text-sm font-black uppercase text-gray-900">
              {editingCategoryId ? 'Edit Category' : 'Create Category / Subcategory'}
            </h2>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Parent Category (Max Level 3 Enforced)</label>
              <select
                value={catParentId}
                onChange={e => setCatParentId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800"
              >
                <option value="">— Root / Mother Category (Level 1) —</option>
                {flattenedCategories
                  .filter(c => c.id !== editingCategoryId && c.depth < 3)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.label} (Level {c.depth} -> allows Level {c.depth + 1})</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Category / Sub-category Name</label>
              <input 
                type="text" 
                placeholder="e.g. BURGERS or BEEF BURGERS" 
                value={catName}
                onChange={e => setCatName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-emerald-500 font-bold"
                required 
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button type="button" onClick={closeCategoryModal} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm">
                {editingCategoryId ? 'Update Category' : 'Save Category'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: PRODUCT / ITEM / DEAL CREATOR (Sticky Header/Footer with Scrollable Body) */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form 
            onSubmit={handleSaveProduct} 
            className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* STICKY HEADER */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white z-10 shrink-0">
              <h2 className="text-sm font-black uppercase text-gray-900">
                {editingProductId ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button 
                type="button" 
                onClick={closeProductModal}
                className="text-gray-400 hover:text-gray-600 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* SCROLLABLE MIDDLE CONFIGURATION SECTION */}
            <div className="p-6 space-y-3 text-xs overflow-y-auto flex-1">
              <div>
                <label className="font-bold text-gray-700">Item Name</label>
                <input type="text" placeholder="e.g. Standard Product or Burger" value={prodName} onChange={e => setProdName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mt-1 font-medium" required />
              </div>

              <div>
                <label className="font-bold text-gray-700">Primary Category (Cascading / Exact Leaf Selector)</label>
                <select value={prodCategory} onChange={e => setProdCategory(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mt-1 font-medium" required>
                  <option value="">Select Exact Primary Category / Subcategory</option>
                  {flattenedCategories.map(c => <option key={c.id} value={c.name}>{c.label}</option>)}
                </select>
              </div>

              {/* CONDITIONAL PHARMACY-SPECIFIC INVENTORY ATTRIBUTES PANEL */}
              {isPharmacy && (
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
                  <span className="font-black text-emerald-900 uppercase block text-xs">
                    💊 Pharmacy & Medical Attributes
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Barcode / QR Code</label>
                      <input 
                        type="text" 
                        placeholder="Scan or type barcode..." 
                        value={prodBarcode} 
                        onChange={e => setProdBarcode(e.target.value)} 
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Brand Name *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Panadol Extra" 
                        value={prodBrandName} 
                        onChange={e => setProdBrandName(e.target.value)} 
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 font-medium text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Generic / Active Ingredient</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Paracetamol" 
                        value={prodGenericName} 
                        onChange={e => setProdGenericName(e.target.value)} 
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 font-medium text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Dosage Strength</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 500mg" 
                        value={prodDosageStrength} 
                        onChange={e => setProdDosageStrength(e.target.value)} 
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 font-medium text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Batch / Lot Number</label>
                      <input 
                        type="text" 
                        placeholder="e.g. BAT-2026-A" 
                        value={prodBatchNumber} 
                        onChange={e => setProdBatchNumber(e.target.value)} 
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Expiry Date</label>
                      <input 
                        type="date" 
                        value={prodExpiryDate} 
                        onChange={e => setProdExpiryDate(e.target.value)} 
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Storage Condition</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Store below 25°C or Refrigerate" 
                      value={prodStorageCondition} 
                      onChange={e => setProdStorageCondition(e.target.value)} 
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 font-medium text-xs"
                    />
                  </div>

                  <div className="pt-1">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={prodIsRxRequired} 
                        onChange={e => setProdIsRxRequired(e.target.checked)} 
                        className="w-4 h-4 accent-rose-600 rounded"
                      />
                      <span className="font-bold text-rose-900 text-xs">Prescription Required (Rx Only)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Multiple Category Linking Enabler (Conditional Toggle with Mother categories tree level expanders) */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-indigo-900 block text-xs">🔗 Multiple Category Linking Enabler</span>
                    <span className="text-[10px] text-indigo-700 block">Cross-link orthogonal/promotional collections (primary ancestry path excluded).</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={prodMultiCategoryEnabled} 
                    onChange={e => setProdMultiCategoryEnabled(e.target.checked)} 
                    className="w-4 h-4 accent-indigo-600 cursor-pointer" 
                  />
                </div>

                {prodMultiCategoryEnabled && (
                  <div className="space-y-1 pt-2 border-t border-indigo-200/70 max-h-48 overflow-y-auto">
                    {motherCategories
                      .filter(m => !excludedForMultiLinking.includes(m.name))
                      .map(mother => {
                        const isChecked = prodLinkedCategories.includes(mother.name)
                        const hasSubs = categories.some(c => c.parent_id === mother.id)
                        const isExpanded = expandedMultiCats.includes(mother.id)
                        const subcategories = categories.filter(c => c.parent_id === mother.id && !excludedForMultiLinking.includes(c.name))

                        return (
                          <div key={mother.id} className="space-y-1">
                            <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isChecked) {
                                    setProdLinkedCategories(prodLinkedCategories.filter(cat => cat !== mother.name))
                                  } else {
                                    setProdLinkedCategories([...prodLinkedCategories, mother.name])
                                  }
                                }}
                                className="flex items-center space-x-2 text-xs font-bold text-gray-800 flex-1 text-left"
                              >
                                <span>{isChecked ? '☑' : '☐'}</span>
                                <span className="truncate">📁 {mother.name}</span>
                              </button>
                              {hasSubs && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isExpanded) {
                                      setExpandedMultiCats(expandedMultiCats.filter(id => id !== mother.id))
                                    } else {
                                      setExpandedMultiCats([...expandedMultiCats, mother.id])
                                    }
                                  }}
                                  className="text-[10px] text-indigo-700 font-bold px-2 py-0.5 bg-indigo-100 rounded hover:bg-indigo-200"
                                >
                                  {isExpanded ? '▲ Hide Subs' : '▼ Subcategories'}
                                </button>
                              )}
                            </div>
                            {isExpanded && subcategories.length > 0 && (
                              <div className="pl-4 space-y-1 border-l-2 border-indigo-200 ml-2">
                                {subcategories.map(sub => {
                                  const subChecked = prodLinkedCategories.includes(sub.name)
                                  const subHasSubs = categories.some(c => c.parent_id === sub.id)
                                  const subExpanded = expandedMultiCats.includes(sub.id)
                                  const l3Subs = categories.filter(c => c.parent_id === sub.id && !excludedForMultiLinking.includes(c.name))

                                  return (
                                    <div key={sub.id} className="space-y-1">
                                      <div className="flex items-center justify-between bg-white p-1.5 rounded-lg border border-gray-200">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (subChecked) {
                                              setProdLinkedCategories(prodLinkedCategories.filter(cat => cat !== sub.name))
                                            } else {
                                              setProdLinkedCategories([...prodLinkedCategories, sub.name])
                                            }
                                          }}
                                          className="flex items-center space-x-2 text-xs font-semibold text-gray-700 flex-1 text-left"
                                        >
                                          <span>{subChecked ? '☑' : '☐'}</span>
                                          <span className="truncate">↳ {sub.name}</span>
                                        </button>
                                        {subHasSubs && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (subExpanded) {
                                                setExpandedMultiCats(expandedMultiCats.filter(id => id !== sub.id))
                                              } else {
                                                setExpandedMultiCats([...expandedMultiCats, sub.id])
                                              }
                                            }}
                                            className="text-[9px] text-indigo-700 font-bold px-1.5 py-0.5 bg-indigo-100 rounded hover:bg-indigo-200"
                                          >
                                            {subExpanded ? '▲' : '&#9660; L3'}
                                          </button>
                                        )}
                                      </div>
                                      {subExpanded && l3Subs.length > 0 && (
                                        <div className="pl-4 space-y-1 border-l-2 border-indigo-200 ml-2">
                                          {l3Subs.map(l3 => {
                                            const l3Checked = prodLinkedCategories.includes(l3.name)
                                            return (
                                              <div key={l3.id} className="flex items-center justify-between bg-white p-1.5 rounded-lg border border-gray-200">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (l3Checked) {
                                                      setProdLinkedCategories(prodLinkedCategories.filter(cat => cat !== l3.name))
                                                    } else {
                                                      setProdLinkedCategories([...prodLinkedCategories, l3.name])
                                                    }
                                                  }}
                                                  className="flex items-center space-x-2 text-xs font-normal text-gray-600 flex-1 text-left"
                                                >
                                                  <span>{l3Checked ? '☑' : '☐'}</span>
                                                  <span className="truncate">↳↳ {l3.name}</span>
                                                </button>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-gray-700">Base Price ({currencySymbol})</label>
                <input type="number" step="0.01" placeholder="550" value={prodPrice} onChange={e => setProdPrice(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mt-1 font-medium" required />
              </div>

              <div>
                <label className="font-bold text-gray-700">Short Description</label>
                <textarea 
                  rows={2}
                  placeholder="Enter item description..." 
                  value={prodDescription} 
                  onChange={e => setProdDescription(e.target.value)} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mt-1 font-medium resize-none"
                />
              </div>

              {/* Desktop Image Upload */}
              <div className="space-y-2">
                <label className="font-bold text-gray-700">Item Image</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleDesktopImageUpload} 
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer bg-gray-50 border border-gray-200 rounded-xl"
                />
                {uploadingImage && <p className="text-[10px] text-amber-600 font-bold animate-pulse">Uploading image...</p>}
                {prodImage && (
                  <div className="flex items-center space-x-3 mt-2 bg-gray-50 p-2 rounded-xl border">
                    <div className="w-12 h-12 bg-white rounded-lg overflow-hidden border flex items-center justify-center p-1">
                      <img src={prodImage} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[10px] text-gray-500 truncate flex-1">{prodImage}</span>
                    <button type="button" onClick={() => setProdImage('')} className="text-red-500 font-bold text-xs px-2">Remove</button>
                  </div>
                )}
              </div>

              {/* FEATURE 1: Universal Product Variant Enabler */}
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900">🥤 Product Variant Enabler (Sizes / Options)</span>
                  <input type="checkbox" checked={prodHasVariants} onChange={e => setProdHasVariants(e.target.checked)} className="w-4 h-4 accent-purple-600" />
                </div>

                {prodHasVariants && (
                  <div className="space-y-2 pt-2 border-t border-purple-200">
                    <span className="text-[10px] font-bold text-purple-800 uppercase block">Define Variant Options & Extra Pricing</span>
                    {prodVariants.map((v, idx) => (
                      <div key={idx} className="flex space-x-2 items-center">
                        <input 
                          type="text" 
                          placeholder="Variant Name (e.g. 50ml or Large)" 
                          value={v.name}
                          onChange={e => {
                            const updated = [...prodVariants]
                            updated[idx].name = e.target.value
                            setProdVariants(updated)
                          }}
                          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 font-medium text-xs"
                        />
                        <input 
                          type="number" 
                          step="0.01" 
                          placeholder="Extra Price" 
                          value={v.price}
                          onChange={e => {
                            const updated = [...prodVariants]
                            updated[idx].price = parseFloat(e.target.value) || 0
                            setProdVariants(updated)
                          }}
                          className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-center font-mono font-bold text-xs"
                        />
                        {prodVariants.length > 1 && (
                          <button type="button" onClick={() => setProdVariants(prodVariants.filter((_, i) => i !== idx))} className="text-red-500 font-bold px-2">✕</button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => setProdVariants([...prodVariants, { name: '', price: 0 }])} className="text-[11px] font-bold text-purple-700 hover:underline pt-1 block">
                      + Add Another Variant Option
                    </button>
                  </div>
                )}
              </div>

              {/* FEATURE 2: Restaurant-Exclusive Product Modifier Enabler */}
              {isRestaurant && (
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-blue-900 block">⚙️ Product Modifier / Add-on Enabler</span>
                      <span className="text-[10px] text-blue-700">Prompts modifier palette (e.g. extra cheese) during POS checkout.</span>
                    </div>
                    <input type="checkbox" checked={prodHasModifiers} onChange={e => setProdHasModifiers(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  </div>
                </div>
              )}

              {/* UNIVERSAL: Deals / Combos / Bundles Creator */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900">🔥 Enable Deals / Combos / Bundles Creator</span>
                  <input type="checkbox" checked={prodIsDeal} onChange={e => setProdIsDeal(e.target.checked)} className="w-4 h-4 accent-amber-600" />
                </div>
                
                {prodIsDeal && (
                  <div className="space-y-2 pt-2 border-t border-amber-200">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">Select Included Items & Quantities</span>
                    {prodDealItems.map((di, idx) => (
                      <div key={idx} className="flex space-x-2 items-center">
                        <select 
                          value={di.itemId} 
                          onChange={e => {
                            const updated = [...prodDealItems]
                            updated[idx].itemId = e.target.value
                            setProdDealItems(updated)
                          }} 
                          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 font-medium"
                          required={prodIsDeal}
                        >
                          <option value="">Select Item from Catalog</option>
                          {products.filter(p => p.id !== editingProductId).map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({currencySymbol} {p.price})</option>
                          ))}
                        </select>

                        <input 
                          type="number" 
                          min="1" 
                          value={di.qty} 
                          onChange={e => {
                            const updated = [...prodDealItems]
                            updated[idx].qty = parseInt(e.target.value) || 1
                            setProdDealItems(updated)
                          }} 
                          className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-center font-mono font-bold"
                        />

                        {prodDealItems.length > 1 && (
                          <button type="button" onClick={() => setProdDealItems(prodDealItems.filter((_, i) => i !== idx))} className="text-red-500 font-bold px-2">✕</button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => setProdDealItems([...prodDealItems, { itemId: '', qty: 1 }])} className="text-[11px] font-bold text-amber-700 hover:underline pt-1 block">
                      + Add Another Item to Bundle
                    </button>
                  </div>
                )}
              </div>

              {/* UNIVERSAL: Promotional Badges Enabler */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">⭐ Promotional Badges Enabler</span>
                  <input type="checkbox" checked={prodBadgeEnabled} onChange={e => setProdBadgeEnabled(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                </div>
                {prodBadgeEnabled && (
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Badge Label</label>
                    <select value={prodBadgeText} onChange={e => setProdBadgeText(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 mt-1 font-bold">
                      <option value="HOT SELLER">HOT SELLER</option>
                      <option value="DISCOUNT">DISCOUNT</option>
                      <option value="SALE">SALE</option>
                      <option value="POPULAR">POPULAR</option>
                      <option value="FEATURED">FEATURED</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-gray-800">Inventory Status</span>
                <button type="button" onClick={() => setProdInStock(!prodInStock)} className={`px-3 py-1 rounded-lg font-bold text-xs ${prodInStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {prodInStock ? '● In Stock' : '✕ Out of Stock'}
                </button>
              </div>
            </div>

            {/* STICKY FOOTER */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-2 bg-white z-10 shrink-0">
              <button type="button" onClick={closeProductModal} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold">Cancel</button>
              <button type="submit" disabled={uploadingImage} className="px-4 py-2 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm">
                {editingProductId ? 'Update Item' : 'Save Item'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}