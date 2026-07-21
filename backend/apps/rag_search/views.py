from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .vectordb import RepositoryIndex

# Global in-memory indexer instance
indexer = RepositoryIndex()

@api_view(['POST'])
def index_code_view(req):
    file_path = req.data.get('file_path')
    code = req.data.get('code')
    
    if not file_path or not code:
        return Response({'error': 'file_path and code are required'}, status=status.HTTP_400_BAD_REQUEST)
        
    indexer.index_code(file_path, code)
    return Response({'success': True, 'message': f"Successfully indexed file: {file_path}"})

@api_view(['POST'])
def search_code_view(req):
    query = req.data.get('query')
    limit = req.data.get('limit', 3)
    
    if not query:
        return Response({'error': 'query is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    results = indexer.search(query, limit)
    
    # Flatten structure for easy frontend consumption
    formatted_results = []
    documents = results.get('documents', [[]])[0]
    metadatas = results.get('metadatas', [[]])[0]
    distances = results.get('distances', [[]])[0]
    
    for doc, meta, dist in zip(documents, metadatas, distances):
        formatted_results.append({
            'document': doc,
            'file_path': meta.get('file_path', 'unknown'),
            'chunk_index': meta.get('chunk_index', 0),
            'similarity': round(1.0 - dist, 4)
        })
        
    return Response({'results': formatted_results})
