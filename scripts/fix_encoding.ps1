$htmlFiles = Get-ChildItem -Path "d:/BIOTV MARKETING/NUEVO BIOTV/PÁGINAS WEB/TPL PAGINA MALA/TPL PRUEBA NUEVA/frontend-v2" -Filter "*.html" -Recurse

foreach ($file in $htmlFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $original = $content
    
    $content = $content.Replace('DiseÃ±o', 'Diseño')
    $content = $content.Replace('diseÃ±o', 'diseño')
    $content = $content.Replace('Ã±', 'ñ')
    $content = $content.Replace('Ã¡', 'á')
    $content = $content.Replace('Ã©', 'é')
    $content = $content.Replace('Ã³', 'ó')
    $content = $content.Replace('Ãº', 'ú')
    $content = $content.Replace('Ã', 'í') # Very common fallback for í
    $content = $content.Replace('Â¿', '¿')
    $content = $content.Replace('Â¡', '¡')

    if ($original -ne $content) {
        Write-Host "Fixed encoding in: "
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    }
}
Write-Host "Done."