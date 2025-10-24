$jsonContent = Get-Content ".\backend-import.json" -Raw
$products = $jsonContent | ConvertFrom-Json

$successCount = 0
$errorCount = 0

foreach ($product in $products) {
    try {
        $productData = @{
            product_id = $product.product_id
            name = $product.name
            full_name = $product.full_name
            description = $product.description
            brand = $product.brand
            industry = $product.industry
            chemistry = $product.chemistry
            url = ""
            image = $product.image
            benefits = $product.benefits
            applications = $product.applications
            technical = $product.technical
            sizing = $product.sizing
            published = $true
            benefits_count = $product.benefits.Count
        } | ConvertTo-Json -Depth 10
        
        $response = Invoke-WebRequest -Uri "https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api/products" -Method POST -Body $productData -ContentType "application/json"
        
        if ($response.StatusCode -eq 201) {
            $successCount++
            Write-Host "✅ Added: $($product.name)"
        } else {
            $errorCount++
            Write-Host "❌ Failed: $($product.name)"
        }
    } catch {
        $errorCount++
        Write-Host "❌ Error adding $($product.name): $($_.Exception.Message)"
    }
}

Write-Host "`nImport Summary:"
Write-Host "Successfully added: $successCount"
Write-Host "Failed: $errorCount"
