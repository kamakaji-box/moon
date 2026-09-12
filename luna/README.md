# Luna — 月面アトラス試作

スマホで月を眺めながら、月面地名を同じ座標系で追従させるための最小プロトタイプ。

## 起動

```bash
python3 -m http.server 4173
```

ブラウザで `http://localhost:4173/` を開く。

## 初版で確認すること

- 月は真円の表示領域として扱う
- 月面画像とラベルは同じ月面表示座標に基づいて移動する
- ピンチズーム / ドラッグパン / デスクトップのホイールズーム
- ラベルの文字は画面上のサイズを保つ
- 右上の「座標」で開発表示。月面をタップすると正規化 x/y を確認できる
- `data/landmarks.js` でラベルデータをUIから分離

## 画像ソース

`assets/lroc_color_2k.jpg` は NASA Scientific Visualization Studio の CGI Moon Kit に掲載された LROC WAC Color Mosaic の2K版。NASA SVSの説明では、Lunar Reconnaissance Orbiter のカメラとレーザー高度計チームのデータをもとにしたカラー/標高マップとして提供されている。

- NASA SVS: https://svs.gsfc.nasa.gov/4720
- 直接画像: https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg

この試作では、全球の正距円筒画像を正面表示の円形領域に切り出している。表示用 `x/y` は挙動確認用の仮値で、正式版では IAU/NASA 等の検証済み月面緯度・経度から投影して生成する。

## 次の段階

1. 正式な月面地名データと座標を検証して置き換える
2. 近側面の正射投影またはタイル化した高解像度アトラスへ移行する
3. 現在日時の月齢・位相を別モードで追加する
4. 必要なら秤動を含む `lat/lon → projection → display x/y` を差し替える
