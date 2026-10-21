# Codex-PNG (1024, hvid bund) -> grafik/ret-<id>.webp: hvid bund fra kanterne bliver gennemsigtig, beskåret og 640 px.
# 640 px, fordi ret-skærmen viser billedet op til 340 css-px, og en iPad har 2 pixels pr. css-px (code review 21-10).
# Brug (Git Bash i D:/Claude/Kogebog): py -I vaerktoej/ret-billede-til-webp.py <png-mappe> <ud-mappe> [id ...]
# PNG-filen hedder <id>.png. Uden id'er tages alle PNG-filer i mappen. Kræver Pillow i den globale py (ikke i appen).
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

sys.stdout.reconfigure(encoding='utf-8')
STR = 640
TOL = 22  # hvor tæt på hvid en kantpixel skal være for at høre til baggrunden


def fjern_bund(img):
    rgb = img.convert('RGB')
    w, h = rgb.size
    # Pixels næsten hvide -> 255 i en maske; fyld kun det, der hænger sammen med kanten
    graa = ImageChops.invert(rgb.convert('L'))  # hvid = 0
    hvid = graa.point(lambda v: 255 if v <= TOL else 0)
    fyld = hvid.copy()
    for x in range(0, w, 8):
        for y in (0, h - 1):
            if fyld.getpixel((x, y)) == 255:
                ImageDraw.floodfill(fyld, (x, y), 128)
    for y in range(0, h, 8):
        for x in (0, w - 1):
            if fyld.getpixel((x, y)) == 255:
                ImageDraw.floodfill(fyld, (x, y), 128)
    bund = fyld.point(lambda v: 255 if v == 128 else 0)
    alfa = ImageChops.invert(bund).filter(ImageFilter.GaussianBlur(1.2))
    ud = rgb.convert('RGBA')
    ud.putalpha(alfa)
    return ud


def main():
    if len(sys.argv) < 3:
        sys.exit('Brug: py -I vaerktoej/ret-billede-til-webp.py <png-mappe> <ud-mappe> [id ...]')
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    ids = sys.argv[3:] or [p.stem for p in sorted(src.glob('*.png'))]
    dst.mkdir(parents=True, exist_ok=True)
    for i in ids:
        img = fjern_bund(Image.open(src / f'{i}.png'))
        boks = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        if boks is None:
            sys.exit(f'{i}: intet motiv fundet (hele billedet blev gennemsigtigt)')
        img = img.crop(boks)
        side = max(img.size)
        kvadrat = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        kvadrat.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
        kvadrat = kvadrat.resize((STR, STR), Image.LANCZOS)
        ud = dst / f'ret-{i}.webp'
        kvadrat.save(ud, 'WEBP', quality=82, method=6)
        print(f'{i}: {ud.stat().st_size // 1024} kB, beskåret til {boks}')


main()
