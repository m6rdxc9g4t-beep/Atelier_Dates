# App Mac « Notre Petit Monde »

Petit lanceur double-cliquable (à poser sur le Bureau ou dans Applications), avec l'icône Atelier Dates.

Au double-clic, il ouvre dans cet ordre :
1. l'app web Safari déjà installée (identifiant `com.apple.Safari.WebApp.F80091C9-…`, propre au Mac de François) ;
2. sinon toute app web Safari nommée « Notre Petit Monde » / « Atelier Dates », ou pointant vers `atelier-dates` ;
3. sinon le site dans Safari.

Le dernier lancement est noté dans `Contents/Resources/last-launch.log`.

Aucune signature n'est nécessaire : l'exécutable est un script shell. Si l'app est téléchargée depuis
Internet, macOS la met en quarantaine ; l'ouvrir une première fois par clic droit → Ouvrir.

Icône : l'icône de la suite (charte v2 « Linear ») `public/brand/icone-atelier-dates.svg` — cœur Lucide blanc sur carré
arrondi en dégradé du rouge de Dates — rendue en 824 px et centrée dans 1024 px (grille des icônes macOS), puis
`AppIcon.icns` (Pillow : `Image.save("AppIcon.icns", sizes=[(16,16)…(1024,1024)])`).
