#!/bin/bash

echo "이미지 최적화 시작..."

# ImageMagick 설치 확인
if ! command -v convert &> /dev/null; then
    echo "ImageMagick을 설치합니다..."
    brew install imagemagick
fi

# 큰 이미지 찾기 및 최적화
echo "1MB 이상 이미지 최적화 중..."
find . -name "*.png" -size +1M | while read file; do
    echo "최적화: $file"
    # 백업 생성
    cp "$file" "${file}.backup"
    # 이미지 압축 (품질 85%, 최대 너비 1920px)
    convert "$file" -quality 85 -resize '1920>' "$file"
    
    # 크기 비교
    original_size=$(ls -lh "${file}.backup" | awk '{print $5}')
    new_size=$(ls -lh "$file" | awk '{print $5}')
    echo "  원본: $original_size → 압축: $new_size"
done

echo ""
echo "GIF 파일 최적화 중..."
find . -name "*.gif" -size +1M | while read file; do
    echo "최적화: $file"
    # GIF 최적화 (색상 수 감소, 크기 조정)
    convert "$file" -coalesce -layers OptimizeFrame -colors 128 -resize '800>' "${file%.gif}_optimized.gif"
    echo "  최적화된 파일: ${file%.gif}_optimized.gif"
done

echo ""
echo "JPG/JPEG 파일 최적화 중..."
find . \( -name "*.jpg" -o -name "*.jpeg" \) -size +1M | while read file; do
    echo "최적화: $file"
    cp "$file" "${file}.backup"
    convert "$file" -quality 85 -resize '1920>' "$file"
done

echo "완료!"