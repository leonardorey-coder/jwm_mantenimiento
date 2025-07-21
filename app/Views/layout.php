<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title><?php echo htmlspecialchars($title ?? 'Sistema de Mantenimiento - JW Marriott'); ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="style.css">
    
    <!-- Favicon para navegadores -->
    <link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192x192.png">
    <link rel="shortcut icon" href="icons/favicon.ico">
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="manifest.json" crossorigin="use-credentials">
    <meta name="theme-color" content="#3498db">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
</head>
<body>
    <header>
        <div class="logo logo-high">
            <img src="logo_high.png" alt="Logo grande del Hotel">
        </div>
        <div class="logo logo-low">
            <img src="logo_low.png" alt="Logo pequeño del Hotel">
        </div>
    </header>
    
    <div class="contenedor">
        <?php if (isset($success) && $success): ?>
            <div class="mensaje mensaje-exito">
                <?php echo htmlspecialchars($success); ?>
            </div>
        <?php endif; ?>
        
        <?php if (isset($error) && $error): ?>
            <div class="mensaje mensaje-error">
                <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>
        
        <?php echo $content ?? ''; ?>
    </div>
    
    <!-- <script src="script_index.js"></script> -->
    <!-- script_index.js deshabilitado - usando solo app-loader.js -->
    <script src="app-loader.js"></script>
</body>
</html> 